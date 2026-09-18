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
// las de km: su tamaño de icono ya es el tamaño real que ocupan. 20 -> 16
// (retoque real: "se ven demasiado grandes" -- ligeramente por encima de
// los 14px del círculo de km, para que sigan destacando un poco como
// marcas especiales, pero ya no desproporcionados).
const ENDPOINT_MARKER_SIZE_PX = 16;

// Contenido del popup al pulsar una marca de km -- mismo ritmo/FC que ya
// muestra "Ritmo por kilómetro" (RunningDetailView.js le pasa ese mismo
// split vía buildKmMarkers(routeTrace, splits) en routeMapPaceColoring.js),
// nunca un dato recalculado aparte. Sin FC si ese split no la trae (OCR de
// Garmin sin tabla de Vueltas con FC, o TCX/GPX sin sensor) -- "—" o un
// guion inventado no, mismo criterio que el resto de la app.
function buildKmPopupHtml(marker) {

    return `

        <div class="route-map-popup-content">

            <strong>Km ${marker.km}</strong>

            <span>${formatSecondsAsClock(marker.paceSecPerKm)}/km</span>

            ${marker.avgHr != null ? `<span>${Math.round(marker.avgHr)} ppm</span>` : ""}

        </div>

    `;

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
// (sin desplazamiento, igual que Garmin/Strava). Dos marcas pueden coincidir
// visualmente si el recorrido pasa muy cerca de sí mismo a la vista inicial
// (ida y vuelta) -- a propósito no se corrige con ningún desplazamiento ni
// fusión: el pellizco para hacer zoom (touchZoom, ver más abajo) es la forma
// real de distinguirlas, tal cual funciona en Garmin.
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

    // "Fotografía" fija del recorrido en cuanto a navegación (sin arrastre,
    // sin controles +/- visibles), pero CON zoom real vía pellizco --
    // retoque real: los marcadores de km pueden solapar a la vista inicial
    // en un recorrido que pasa cerca de sí mismo, y la forma real de
    // distinguirlos (igual que en Garmin) es acercarse con los dedos, no un
    // desplazamiento ni fusión automática. touchZoom:true (no 'center') deja
    // que el pellizco también recentre hacia el punto donde se pellizca, no
    // solo hacia el centro fijo del mapa -- así se puede "entrar" a la zona
    // concreta con los km apretados. zoomControl:false sigue ocultando los
    // botones +/- (sin controles visuales, solo el gesto); scrollWheelZoom/
    // doubleClickZoom/boxZoom siguen desactivados (gestos de escritorio o de
    // un solo toque que no se han pedido). Nota: con dragging:false, una vez
    // ampliado no se puede deslizar con un dedo para explorar más allá de
    // adonde llevó el pellizco -- limitación conocida y aceptada por ahora.
    //
    // tap: true a propósito -- las marcas de km SÍ son interactivas (tocar
    // muestra su ritmo/FC, ver más abajo) y ese handler de Leaflet es el que
    // hace fiable el tap-a-click en iOS Safari.
    const map = L.map(container, {
        zoomControl: false,
        dragging: false,
        touchZoom: true,
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
    // más abajo. Esto es solo el encuadre INICIAL -- el pellizco del usuario
    // (touchZoom, ver arriba) sigue animándose con normalidad después.
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

    // El círculo solo muestra el número (especificación de cierre del Paso
    // 2: "no queremos duplicar el detalle del gráfico de abajo a la
    // vista") -- el ritmo/FC de ese km concreto vive en un popup al pulsar
    // (ver buildKmPopupHtml), no permanentemente en el mapa. Cada marca en
    // su posición geométrica exacta, sin desplazamiento -- si dos coinciden
    // en pantalla a la vista inicial, el pellizco del usuario (touchZoom,
    // ver arriba) es lo que las distingue, no un cálculo aquí.
    markers.forEach(marker => {

        const leafletMarker = L.marker([marker.lat, marker.lon], {
            icon: L.divIcon({
                className: "route-map-km-marker-wrap",
                html: `<span class="route-map-km-marker">${marker.km}</span>`,
                iconSize: [KM_MARKER_TAP_SIZE_PX, KM_MARKER_TAP_SIZE_PX],
                iconAnchor: [KM_MARKER_TAP_SIZE_PX / 2, KM_MARKER_TAP_SIZE_PX / 2]
            }),
            // interactive:true -- especificación de cierre del Paso 2: al
            // pulsar un km debe verse su ritmo/FC real. keyboard:false
            // porque este mapa no tiene foco de teclado (no es navegable).
            interactive: true,
            keyboard: false
        }).addTo(map);

        // Sin dato real que enseñar (entreno demasiado corto para tener
        // splits, ver initRunningEvents.js) -- nunca un popup con guiones,
        // mismo criterio de "nunca inventar" del resto de la app.
        if (marker.paceSecPerKm != null) {
            leafletMarker.bindPopup(buildKmPopupHtml(marker), { closeButton: false, className: "route-map-popup" });
        }

    });

    return map;

}

export function unmountRouteMap(map) {
    map?.remove();
}
