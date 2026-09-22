import "./RouteMap.css";

import { formatSecondsAsClock } from "../../utils/format.js";

// Contorno blanco debajo de la línea de color -- sobre satélite real
// (terreno/vegetación/tejados variables según la zona, más "ruidoso"
// visualmente que un mapa de calles o de relieve plano) una línea plana
// puede perder contraste en algunos tramos; el "casing" es la técnica
// estándar de Garmin/Strava para que el trazado se lea igual de bien en
// cualquier fondo, no un adorno.
const ROUTE_LINE_CASING_COLOR = "#FFFFFF";

// Satélite real (Esri World Imagery) en vez del terreno con relieve que
// usaba antes Stadia/Stamen -- sustituye esa capa por completo (pedido
// explícito: único estilo de mapa en todo el proyecto). Nunca se llama a
// Esri directamente desde el cliente: pasa por el proxy propio del backend
// (GET /api/tiles/satellite/:z/:y/:x, ver server/src/routes/tiles.js), que
// guarda la ESRI_API_KEY real solo en el servidor y nunca la expone aquí.
// {z}/{y}/{x} en vez del {z}/{x}/{y} habitual de una plantilla XYZ de
// Leaflet -- ese proxy espera el mismo orden que exige la propia URL de
// Esri (MapServer/tile/{level}/{row}/{col} = z/y/x), no lo reordena él
// mismo; ver el comentario junto a esa ruta en el backend.
const SATELLITE_TILE_URL = "https://api.corredorsolido.es/api/tiles/satellite/{z}/{y}/{x}";

// Créditos reales de World Imagery -- "Esri" con enlace (requisito de
// atribución de la licencia) más los proveedores de datos que Esri cita
// hoy para esta capa (Maxar, Earthstar Geographics, comunidad de usuarios
// de su SIG). Un único texto para TODOS los mapas del proyecto (mapa
// individual pequeño/fullscreen y tarjetas de Comunidad) -- nunca una
// versión "recortada" distinta solo por ir en una tarjeta pequeña, para no
// arriesgar quedarse corto de atribución en ningún sitio; lo que sí cambia
// según el tamaño del mapa es el tratamiento visual (fuente pequeña +
// ajuste de línea en vez de una sola línea sin cortar, ver RouteMap.css)
// para que no ocupe una proporción desmedida de una tarjeta pequeña.
const SATELLITE_ATTRIBUTION = '&copy; <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a> — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

// Techo de zoom real de World Imagery -- Esri solo garantiza cobertura
// global completa hasta este nivel; por encima solo hay imagen de mayor
// resolución en zonas concretas (grandes ciudades, ciertas regiones), igual
// que ya pasaba con el terreno de Stadia/Stamen (bug real ya corregido ahí:
// un techo declarado más alto que la cobertura real de una zona rural
// concreta producía tiles en blanco/de disculpa en vez de un error que
// Leaflet pudiera detectar). 19 es el nivel que Esri documenta como
// cobertura global para esta capa -- conservador a propósito: un recorrido
// de trail en zona rural tiene más probabilidad real de toparse con el
// límite de cobertura que uno urbano. Si en la práctica aparecen tiles en
// blanco a este nivel en alguna zona concreta, bajar más -- no hay una
// cifra "segura" universal, depende de qué zona cubra cada recorrido.
const SATELLITE_MAX_ZOOM = 19;

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
        // pellizco nunca pueda pasarse del límite real (ver SATELLITE_MAX_ZOOM).
        maxZoom: SATELLITE_MAX_ZOOM,
        attributionControl: false
    });

    L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

    // Sin detectRetina -- a diferencia de la plantilla de Stadia que sí
    // llevaba {r} para servir tiles @2x, el proxy propio (server/src/routes/
    // tiles.js) no tiene ninguna variante retina que reenviar: pediría un
    // tile con un sufijo que la ruta no reconoce. World Imagery ya sirve una
    // resolución razonable en su zoom nativo sin ese extra.
    L.tileLayer(SATELLITE_TILE_URL, {
        attribution: SATELLITE_ATTRIBUTION,
        maxZoom: SATELLITE_MAX_ZOOM
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
    // Casing +1 en los dos modos (5/3 -> 6/4) tras cambiar a satélite real --
    // el color de la línea (segmentType/ritmo, routeMapPaceColoring.js) NO
    // cambia, pero un halo blanco más fino se perdía más fácilmente contra
    // el fondo variable de una foto real (tejados claros, arena, hormigón)
    // de lo que se perdía contra el terreno ilustrado de antes. colorWeight
    // se queda igual -- el grosor de la línea de color en sí no necesitaba
    // tocarse, solo el contorno que la separa del fondo.
    //
    // smoothFactor:0 -- bug real corregido: por defecto (1.0) Leaflet
    // SIMPLIFICA el trazado al dibujarlo (quita vértices "redundantes" por
    // rendimiento), así que la línea VISIBLE podía pasar a un par de
    // píxeles de un marcador de km, aunque ese marcador esté calculado
    // exactamente sobre la traza ORIGINAL sin simplificar (interpolateAtDistance
    // en routeMapPaceColoring.js). Con smoothFactor:0 la línea dibujada pasa
    // por todos los puntos reales -- sin coste perceptible para un
    // recorrido de unos pocos cientos de puntos.
    const casingWeight = interactive ? 7 : 6;
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

    // invalidateSize() defensivo antes de encuadrar -- el contenedor puede
    // no tener todavía su tamaño real definitivo en el momento exacto en
    // que Leaflet se inicializa (el overlay de pantalla completa se acaba
    // de insertar en el DOM en este mismo ciclo de render), y un tamaño
    // erróneo en ese instante desincroniza todo lo que Leaflet calcula
    // después a partir de él (encuadre, zoom, posición de sus propios
    // controles). Práctica estándar recomendada por Leaflet para mapas
    // montados en contenedores recién insertados/mostrados.
    map.invalidateSize();

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
