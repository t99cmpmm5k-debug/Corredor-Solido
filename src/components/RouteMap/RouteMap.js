import "./RouteMap.css";

import { formatSecondsAsClock } from "../../utils/format.js";

// Contorno blanco debajo de la línea de color -- sobre un mapa de terreno
// (verdes/marrones variables según la zona) una línea plana puede perder
// contraste en algunos tramos; el "casing" es la técnica estándar de
// Garmin/Strava para que el trazado se lea igual de bien en cualquier
// fondo, no un adorno.
const ROUTE_LINE_CASING_COLOR = "#FFFFFF";

// Terreno con relieve/vegetación (Stamen Terrain, servido hoy por Stadia
// Maps) en vez del estilo "calles" plano de OSM estándar -- pedido
// explícito de diseño (especificación de cierre del mapa, punto 3):
// visualmente más atractivo y con más sentido temático para running/trail.
// En localhost funciona sin ninguna configuración (autenticación por
// dominio de Stadia deja pasar localhost/127.0.0.1 siempre); en producción
// hace falta dar de alta una cuenta gratuita en stadiamaps.com y añadir el
// dominio real (el de GitHub Pages) a la lista blanca de esa cuenta -- sin
// eso, los tiles no cargan en producción aunque el código esté bien.
const TERRAIN_TILE_URL = "https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png";
const TERRAIN_ATTRIBUTION = '&copy; <a href="https://stadiamaps.com/attribution/" target="_blank" rel="noopener">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank" rel="noopener">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

// Tamaño real del círculo VISIBLE de marca de km -- debe coincidir EXACTO
// con .route-map-km-marker (RouteMap.css, box-sizing:border-box) para que
// el centrado cuadre con su coordenada. 18px -> 14px (retoque de acabado:
// "demasiado grandes/ocupan mucho espacio").
const KM_MARKER_SIZE_PX = 14;

// Zona de TOQUE real del icono de Leaflet -- más grande que el círculo
// visible a propósito (mismo patrón que usan las apps nativas: un objetivo
// táctil de 14px es demasiado pequeño para un dedo en iPhone, aunque el
// dibujo en sí deba verse pequeño y discreto). .route-map-km-marker-wrap
// centra el círculo pequeño dentro de esta caja invisible más grande vía
// flex, ver RouteMap.css.
const KM_MARKER_TAP_SIZE_PX = 32;

// Marcas de inicio/fin (especificación de cierre: "igual que Garmin, saber
// de un vistazo dónde empezó y terminó") -- no interactivas (sin popup, sin
// dato que consultar), así que no necesitan una zona de toque ampliada como
// las de km: su tamaño de icono ya es el tamaño real que ocupan.
const ENDPOINT_MARKER_SIZE_PX = 20;

// Separación mínima en PÍXELES DE PANTALLA (no metros de recorrido) entre
// dos marcas de km ya colocadas -- un recorrido con giros o ida-y-vuelta
// puede traer dos kilómetros distintos muy cerca EN EL MAPA aunque estén
// lejos en la ruta real (bug real reportado: km 1/5 y km 2/4 casi
// solapados). Comprobar la distancia sobre el propio mapa ya encuadrado
// (en vez de una distancia fija en metros) es lo único que funciona igual
// de bien a cualquier zoom, porque el zoom final depende de la extensión
// real de cada recorrido y varía de un entreno a otro.
const MIN_KM_MARKER_SPACING_PX = KM_MARKER_SIZE_PX + 6;

// Agrupa marcadores cuya posición en pantalla (píxeles, no metros de
// recorrido) cae a menos de spacingPx entre sí -- transitivo (si A está
// cerca de B y B cerca de C, los tres entran en el mismo grupo), no solo
// por pares consecutivos. Un recorrido con giros/vueltas cerca de sí mismo
// puede juntar más de dos marcas en el mismo sitio.
function clusterByProximity(points, spacingPx) {

    const parent = points.map((_, i) => i);

    function find(x) {
        while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
    }

    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {

            if (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < spacingPx) {
                const ri = find(i), rj = find(j);
                if (ri !== rj) parent[ri] = rj;
            }

        }
    }

    const groups = new Map();

    points.forEach((_, i) => {
        const root = find(i);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root).push(i);
    });

    return [...groups.values()];

}

// Cada marcador de km se coloca en su posición geométrica EXACTA sobre el
// trazado (igual que Garmin/Strava -- ver buildKmMarkers en
// routeMapPaceColoring.js), sin ningún desplazamiento lateral: el propio
// orden numérico creciente sobre la línea ya comunica el sentido del
// recorrido. Pero un recorrido con giros o ida-y-vuelta puede traer dos
// kilómetros distintos muy cerca EN PANTALLA aunque estén lejos en la ruta
// real (bug real reportado: km 1/5 y 2/4 casi encima) -- desplazar
// cualquiera de los dos a un lado u otro de la línea resultó en marcas mal
// posicionadas (el rumbo real en el km lejano suele ir en sentido
// contrario al del km cercano, así que cualquier eje "prestado" quedaba
// torcido). En vez de mover nada de su sitio real, los marcadores que
// coinciden en pantalla se FUNDEN en uno solo ("1·5") colocado en la
// posición real del primero de ellos (orden cronológico, ver el comentario
// de buildKmMarkers) -- ninguno de los dos queda oculto ni sin poder
// consultarse, y ninguno se desplaza de su sitio geométrico real.
export function mergeOverlappingKmMarkers(markers, points, spacingPx) {

    const clusters = clusterByProximity(points, spacingPx);

    return clusters.map(indices => {

        const members = indices.map(i => markers[i]);
        const [first] = members;

        return {
            lat: first.lat,
            lon: first.lon,
            label: members.map(m => m.km).join("·"),
            entries: members.map(m => ({ km: m.km, paceSecPerKm: m.paceSecPerKm, avgHr: m.avgHr }))
        };

    });

}

// Contenido del popup al pulsar una marca de km -- mismo ritmo/FC que ya
// muestra "Ritmo por kilómetro" (RunningDetailView.js le pasa ese mismo
// split vía buildKmMarkers(routeTrace, splits) en routeMapPaceColoring.js),
// nunca un dato recalculado aparte. Un grupo fusionado (mergeOverlappingKmMarkers)
// trae más de una entrada -- una fila por km, en vez de una sola. Un km sin
// ritmo real (entreno demasiado corto para tener splits) no genera fila --
// "—" o un guion inventado no, mismo criterio que el resto de la app.
function buildKmPopupHtml(group) {

    const rows = group.entries
        .filter(entry => entry.paceSecPerKm != null)
        .map(entry => `

            <div class="route-map-popup-row">

                <strong>Km ${entry.km}</strong>

                <span>${formatSecondsAsClock(entry.paceSecPerKm)}/km</span>

                ${entry.avgHr != null ? `<span>${Math.round(entry.avgHr)} ppm</span>` : ""}

            </div>

        `)
        .join("");

    return `<div class="route-map-popup-content">${rows}</div>`;

}

// Leyenda "Más lento <- degradado -> Más rápido" (especificación de cierre
// del Paso 2) -- HTML plano, no un control de Leaflet: siempre legible a
// cualquier zoom/tamaño de mapa, sin competir por espacio con la
// atribución. La llama RunningDetailView.js justo debajo del contenedor del
// mapa, solo cuando de verdad hay coloreado por ritmo (no en Recorridos de
// referencia ni con menos de MIN_SPLITS_FOR_CHART splits reales).
export function RouteMapLegend() {

    return `

        <div class="route-map-legend">

            <span class="route-map-legend-label">Más lento</span>

            <span class="route-map-legend-bar"></span>

            <span class="route-map-legend-label">Más rápido</span>

        </div>

    `;

}

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
//
// segments: array de {latlngs:[[lat,lon],...], color} -- este componente no
// sabe nada de "ritmo" ni "splits", solo dibuja lo que le den (esa lógica
// vive en routeMapPaceColoring.js, propio de Running). El caso sin
// coloreado (Paso 1, o Recorridos de referencia) simplemente pasa un único
// segmento con todo el trazado.
// markers: array opcional de {lat, lon, km, paceSecPerKm, avgHr} -- marcas
// de km completo, cada una en su posición geométrica exacta sobre la línea
// (sin desplazamiento -- ver mergeOverlappingKmMarkers para el caso de dos
// que coinciden en pantalla).
// routeTrace: los mismos puntos {lat,lon} que ya dibujan `segments`, para
// poder marcar inicio/fin en sus dos extremos reales -- no hace falta que
// este componente sepa nada más de la traza (routeTrace[0]/[length-1] son
// ya el inicio/fin real, ordenados cronológicamente por construcción, ver
// geoTrace.js/tcx.js/gpx.js).
export async function mountRouteMap(container, segments, markers = [], routeTrace = []) {

    const [{ default: L }] = await Promise.all([
        import("leaflet"),
        import("leaflet/dist/leaflet.css")
    ]);

    // "Fotografía" fija del recorrido, no un mapa de consulta (especificación
    // de cierre, punto 1) -- toda interacción de navegación desactivada;
    // solo queda el control de atribución, obligatorio por licencia de los
    // tiles (Stadia/Stamen/OpenMapTiles/OSM). attributionControl:false aquí
    // + control propio justo debajo con prefix:false -- el control por
    // defecto de Leaflet antepone su propio banderín/enlace a "Leaflet"
    // (cortesía del proyecto, no una obligación de licencia) delante de nuestra
    // atribución real, y con el poco ancho de esta tarjeta era lo primero
    // que se veía cortado.
    //
    // tap: true (no false) a propósito -- aunque el mapa en sí sigue sin
    // pan/zoom, las marcas de km SÍ son interactivas (tocar muestra su
    // ritmo/FC, ver más abajo) y ese handler de Leaflet es el que hace
    // fiable el tap-a-click en iOS Safari. dragging/zoomControl/etc. siguen
    // desactivados aparte, así que esto no reactiva ningún paneo/zoom.
    const map = L.map(container, {
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: true,
        attributionControl: false
    });

    L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

    // detectRetina: la plantilla de Stadia lleva {r} para servir tiles @2x
    // en pantallas de alta densidad (iPhone) -- más nitidez sin coste
    // adicional de implementación.
    L.tileLayer(TERRAIN_TILE_URL, {
        attribution: TERRAIN_ATTRIBUTION,
        maxZoom: 18,
        detectRetina: true
    }).addTo(map);

    // Todos los "casing" (contorno blanco) primero y todas las líneas de
    // color después -- si no, el casing de un segmento posterior taparía
    // parte de la línea de color del segmento anterior justo en el punto de
    // frontera que ambos comparten. Pesos más finos que en el primer
    // acabado (8/5 -> 5/3, retoque de acabado: "se ve demasiado grueso").
    segments.forEach(segment => {

        L.polyline(segment.latlngs, {
            color: ROUTE_LINE_CASING_COLOR,
            weight: 5,
            opacity: 0.85,
            lineCap: "round",
            lineJoin: "round"
        }).addTo(map);

    });

    segments.forEach(segment => {

        L.polyline(segment.latlngs, {
            color: segment.color,
            weight: 3,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round"
        }).addTo(map);

    });

    const bounds = L.latLngBounds(segments.flatMap(segment => segment.latlngs));

    // animate:false -- fitBounds necesita haber fijado ya el zoom/centro
    // definitivos de verdad (no a medias, en pleno vuelo de una animación)
    // antes de poder convertir lat/lon de las marcas a píxeles de pantalla
    // más abajo. El mapa no es interactivo (especificación del Paso 1), así
    // que tampoco hay ninguna transición que "se note" al quitarla.
    map.fitBounds(bounds, { padding: [24, 24], animate: false });

    // Marcas de inicio/fin -- los dos extremos reales de la traza, sin
    // ningún cálculo de dirección: el propio orden de los números de km
    // creciendo sobre la línea ya comunica el sentido del recorrido (las
    // flechas de sentido que había antes se han quitado por redundantes).
    // No interactivas -- son solo contexto visual, sin dato que consultar.
    if (routeTrace.length >= 2) {

        const start = routeTrace[0];
        const finish = routeTrace[routeTrace.length - 1];

        L.marker([start.lat, start.lon], {
            icon: L.divIcon({
                className: "route-map-endpoint-marker-wrap",
                html: `<span class="route-map-endpoint-marker route-map-endpoint-marker--start"></span>`,
                iconSize: [ENDPOINT_MARKER_SIZE_PX, ENDPOINT_MARKER_SIZE_PX],
                iconAnchor: [ENDPOINT_MARKER_SIZE_PX / 2, ENDPOINT_MARKER_SIZE_PX / 2]
            }),
            interactive: false,
            keyboard: false
        }).addTo(map);

        L.marker([finish.lat, finish.lon], {
            icon: L.divIcon({
                className: "route-map-endpoint-marker-wrap",
                html: `<span class="route-map-endpoint-marker route-map-endpoint-marker--finish"><iconify-icon icon="solar:flag-bold-duotone"></iconify-icon></span>`,
                iconSize: [ENDPOINT_MARKER_SIZE_PX, ENDPOINT_MARKER_SIZE_PX],
                iconAnchor: [ENDPOINT_MARKER_SIZE_PX / 2, ENDPOINT_MARKER_SIZE_PX / 2]
            }),
            interactive: false,
            keyboard: false
        }).addTo(map);

    }

    // El círculo solo muestra el/los número(s) (especificación de cierre
    // del Paso 2: "no queremos duplicar el detalle del gráfico de abajo a
    // la vista") -- el ritmo/FC de cada km concreto vive en un popup al
    // pulsar (ver buildKmPopupHtml), no permanentemente en el mapa.
    //
    // mergeOverlappingKmMarkers trabaja en píxeles de pantalla (no metros de
    // recorrido) -- un recorrido con giros o ida-y-vuelta puede traer dos km
    // distintos muy cerca EN EL MAPA aunque estén lejos en la ruta real;
    // comprobarlo sobre el mapa ya encuadrado es lo único que funciona igual
    // a cualquier zoom (bug real reportado: km 1/5 y 2/4 casi solapados).
    const markerPoints = markers.map(m => map.latLngToContainerPoint([m.lat, m.lon]));
    const groups = mergeOverlappingKmMarkers(markers, markerPoints, MIN_KM_MARKER_SPACING_PX);

    groups.forEach(group => {

        const isMerged = group.entries.length > 1;

        const leafletMarker = L.marker([group.lat, group.lon], {
            icon: L.divIcon({
                className: "route-map-km-marker-wrap",
                html: `<span class="route-map-km-marker ${isMerged ? "route-map-km-marker--merged" : ""}">${group.label}</span>`,
                iconSize: [KM_MARKER_TAP_SIZE_PX, KM_MARKER_TAP_SIZE_PX],
                iconAnchor: [KM_MARKER_TAP_SIZE_PX / 2, KM_MARKER_TAP_SIZE_PX / 2]
            }),
            // interactive:true -- especificación de cierre del Paso 2: al
            // pulsar un km debe verse su ritmo/FC real. keyboard:false
            // porque este mapa no tiene foco de teclado (no es navegable).
            interactive: true,
            keyboard: false
        }).addTo(map);

        // Sin ningún dato real que enseñar en ninguna de sus entradas
        // (entreno demasiado corto para tener splits, ver
        // initRunningEvents.js) -- nunca un popup con guiones ni vacío,
        // mismo criterio de "nunca inventar" del resto de la app.
        if (group.entries.some(entry => entry.paceSecPerKm != null)) {
            leafletMarker.bindPopup(buildKmPopupHtml(group), { closeButton: false, className: "route-map-popup" });
        }

    });

    return map;

}

export function unmountRouteMap(map) {
    map?.remove();
}
