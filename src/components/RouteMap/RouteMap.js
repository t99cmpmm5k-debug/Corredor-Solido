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

// Bug real reportado: al hacer zoom en pantalla completa, en algún punto
// aparecía el logo de Stadia flotando sobre un tile en blanco. La
// documentación de Stadia dice que este endpoint concreto (el legacy
// /tiles/stamen_terrain/) admite hasta zoom 20 en general -- pero el bug ya
// ocurría con el límite anterior (18), así que el problema real no es un
// techo de zoom mal declarado, sino falta de cobertura real de este estilo
// (hillshade/terreno, no satélite) en según qué zonas rurales a esa
// profundidad de zoom -- ese "tile de disculpa" con su logo es lo que
// Stadia sirve cuando no tiene datos reales para un tile concreto, con
// HTTP 200 (no un error real que Leaflet pueda detectar y sustituir solo).
// Bajado a 16 -- techo conservador, muy por debajo de donde ya se vio el
// problema, que sigue dejando ver calles/edificios/curvas de nivel reales
// con detalle de sobra para un mapa de recorrido. Si en la práctica sigue
// apareciendo el logo a este nivel, bajar más -- no hay una cifra "segura"
// universal, depende de qué zona rural concreta cubra cada recorrido.
const TERRAIN_MAX_ZOOM = 16;

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

// Envuelve el mapa pequeño para que TODO él sea un único objetivo táctil
// que abre el modo pantalla completa (ver RouteMapFullscreenOverlay) -- el
// mapa pequeño en sí ya no tiene nada interactivo dentro (mountRouteMap con
// interactive:false: ni marcadores con popup, ni zoom, ni arrastre), así
// que un solo listener en todo el contenedor no compite con nada.
// legendHtml opcional (RouteMapLegend(), ya renderizada por quien llama) --
// retoque real: la leyenda vive DENTRO del área visual del mapa como
// overlay flotante (position:absolute sobre este mismo envoltorio, ver
// RouteMap.css), nunca como bloque aparte debajo -- mismo criterio que ya
// usa RouteMapFullscreenOverlay.
export function RouteMapTapTarget(id = "route-map", legendHtml = "") {

    return `

        <div class="route-map-tap-target" data-action="open-route-map-fullscreen">

            ${RouteMapContainer(id)}

            ${legendHtml}

        </div>

    `;

}

// Overlay a pantalla completa ("explorar el recorrido") -- toda la
// interactividad real (zoom por pellizco, arrastre, marcadores de km con
// popup) vive AQUÍ, nunca en el mapa pequeño. Es una instancia de Leaflet
// SEPARADA (mountRouteMap se llama otra vez sobre este contenedor, con
// interactive:true) -- Leaflet no permite mover un mapa ya montado de un
// contenedor a otro. legendHtml opcional, ya renderizado por quien llama
// (RouteMapLegend() de siempre) -- este componente sigue sin saber nada de
// "ritmo"/splits.
export function RouteMapFullscreenOverlay(id = "route-map-fullscreen", legendHtml = "") {

    return `

        <div class="route-map-fullscreen-overlay">

            <button class="route-map-fullscreen-close" data-action="close-route-map-fullscreen" aria-label="Cerrar mapa a pantalla completa">
                <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>
            </button>

            <div class="route-map-fullscreen-map" id="${id}"></div>

            ${legendHtml}

        </div>

    `;

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
// visualmente si el recorrido pasa muy cerca de sí mismo -- a propósito no
// se corrige con ningún desplazamiento ni fusión: el modo pantalla completa
// (ver RouteMapFullscreenOverlay/options.interactive) es la forma real de
// distinguirlas acercándose, tal cual funciona en Garmin.
// routeTrace: los mismos puntos {lat,lon} que ya dibujan `segments`, para
// poder marcar inicio/fin en sus dos extremos reales -- no hace falta que
// este componente sepa nada más de la traza (routeTrace[0]/[length-1] son
// ya el inicio/fin real, ordenados cronológicamente por construcción, ver
// geoTrace.js/tcx.js/gpx.js).
// options.interactive (false por defecto): el mapa PEQUEÑO es una
// "fotografía" fija de verdad -- ni zoom, ni arrastre, ni marcadores
// interactivos, nada, ver retoque real "que sea solo una foto". El modo
// pantalla completa (RouteMapFullscreenOverlay) llama a esto una SEGUNDA
// vez sobre su propio contenedor con interactive:true: zoom por pellizco Y
// arrastre libres para poder explorar el recorrido, marcadores de km con
// popup. zoomControl (botones +/-) se queda en false SIEMPRE, en los dos
// modos -- nunca controles visuales de zoom, solo el gesto.
export async function mountRouteMap(container, segments, markers = [], routeTrace = [], { interactive = false } = {}) {

    const [{ default: L }] = await Promise.all([
        import("leaflet"),
        import("leaflet/dist/leaflet.css")
    ]);

    // tap: true siempre -- en modo interactivo hace fiable el tap-a-click de
    // los marcadores en iOS Safari; en el mapa pequeño no interactivo no
    // hace nada (no hay nada que reciba el tap), así que no hace falta
    // condicionarlo.
    const map = L.map(container, {
        zoomControl: false,
        dragging: interactive,
        touchZoom: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        boxZoom: false,
        keyboard: interactive,
        tap: true,
        // Explícito aquí además de en el tileLayer de abajo -- Leaflet ya
        // debería derivarlo solo del maxZoom de la capa, pero fijarlo
        // también en el propio mapa es lo que de verdad garantiza que el
        // pellizco nunca pueda pasarse del límite real (ver TERRAIN_MAX_ZOOM).
        maxZoom: TERRAIN_MAX_ZOOM,
        attributionControl: false
    });

    L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

    // detectRetina: la plantilla de Stadia lleva {r} para servir tiles @2x
    // en pantallas de alta densidad (iPhone) -- más nitidez sin coste
    // adicional de implementación.
    L.tileLayer(TERRAIN_TILE_URL, {
        attribution: TERRAIN_ATTRIBUTION,
        maxZoom: TERRAIN_MAX_ZOOM,
        detectRetina: true
    }).addTo(map);

    // Todos los "casing" (contorno blanco) primero y todas las líneas de
    // color después -- si no, el casing de un segmento posterior taparía
    // parte de la línea de color del segmento anterior justo en el punto de
    // frontera que ambos comparten. Pesos más finos que en el primer
    // acabado (8/5 -> 5/3, retoque de acabado: "se ve demasiado grueso") --
    // pero un pelín más gruesos en modo interactivo (pantalla completa,
    // +1/+1) que en el mapa pequeño: retoque real, "se ve demasiado fino al
    // hacer zoom" -- con más zoom real disponible el trazo fino de la vista
    // general se queda corto para leerse bien ampliado.
    //
    // smoothFactor:0 -- bug real corregido: por defecto (1.0) Leaflet
    // SIMPLIFICA el trazado al dibujarlo (quita vértices "redundantes" por
    // rendimiento), así que la línea VISIBLE podía pasar a un par de
    // píxeles de un marcador de km, aunque ese marcador esté calculado
    // exactamente sobre la traza ORIGINAL sin simplificar (interpolateAtDistance
    // en routeMapPaceColoring.js). Con smoothFactor:0 la línea dibujada pasa
    // por todos los puntos reales -- sin coste perceptible para un
    // recorrido de unos pocos cientos de puntos.
    const casingWeight = interactive ? 6 : 5;
    const colorWeight = interactive ? 4 : 3;

    segments.forEach(segment => {

        L.polyline(segment.latlngs, {
            color: ROUTE_LINE_CASING_COLOR,
            weight: casingWeight,
            opacity: 0.85,
            lineCap: "round",
            lineJoin: "round",
            smoothFactor: 0
        }).addTo(map);

    });

    segments.forEach(segment => {

        L.polyline(segment.latlngs, {
            color: segment.color,
            weight: colorWeight,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round",
            smoothFactor: 0
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
    // (ver buildKmPopupHtml), solo en modo interactivo (pantalla completa).
    // Cada marca en su posición geométrica exacta, sin desplazamiento -- si
    // dos coinciden en pantalla, el zoom de pantalla completa es lo que las
    // distingue, no un cálculo aquí.
    markers.forEach(marker => {

        const leafletMarker = L.marker([marker.lat, marker.lon], {
            icon: L.divIcon({
                className: "route-map-km-marker-wrap",
                html: `<span class="route-map-km-marker">${marker.km}</span>`,
                iconSize: [KM_MARKER_TAP_SIZE_PX, KM_MARKER_TAP_SIZE_PX],
                iconAnchor: [KM_MARKER_TAP_SIZE_PX / 2, KM_MARKER_TAP_SIZE_PX / 2]
            }),
            // interactive: en el mapa pequeño (interactive:false) es solo
            // una foto -- ni siquiera los marcadores responden al toque, ver
            // el comentario de options.interactive más arriba. keyboard:false
            // porque este mapa no navega por foco (el paneo por teclado, si
            // lo hay, es del propio mapa vía options.keyboard).
            interactive,
            keyboard: false
        }).addTo(map);

        // Sin dato real que enseñar (entreno demasiado corto para tener
        // splits, ver initRunningEvents.js) -- nunca un popup con guiones,
        // mismo criterio de "nunca inventar" del resto de la app. Tampoco
        // se liga popup si el propio marcador no es interactivo (mapa
        // pequeño) -- nunca podría abrirse, es puro ruido dejarlo enlazado.
        if (interactive && marker.paceSecPerKm != null) {
            leafletMarker.bindPopup(buildKmPopupHtml(marker), { closeButton: false, className: "route-map-popup" });
        }

    });

    return map;

}

export function unmountRouteMap(map) {
    map?.remove();
}
