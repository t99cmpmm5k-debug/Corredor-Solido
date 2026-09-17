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

// Cuando dos o más marcas de km quedan a menos de spacingPx en pantalla
// (recorrido con giros o ida-y-vuelta cerca de sí mismo -- ver bug real
// reportado: km 1/5 y 2/4 casi encima), se reparten a lados opuestos de la
// línea en vez de ocultar o simplemente encoger ninguna -- mismo criterio
// visual que usan Garmin Connect/Strava. `directions[i]` es el vector
// unitario perpendicular al recorrido EN EL PUNTO i (ver
// perpendicularUnitVector en mountRouteMap) -- cada marcador usa siempre
// SU PROPIA dirección local, nunca la de otro miembro del grupo: en un
// recorrido que pasa cerca de sí mismo (ida y vuelta por la misma zona,
// caso real verificado) el rumbo real en el km lejano suele ir en sentido
// contrario al del km cercano, así que imponer un único eje "prestado"
// desplazaba la marca en un ángulo que no correspondía a la línea real
// bajo ella. Regla fija y predecible, sin comparar geometrías entre sí
// caso por caso: dentro de cada grupo (ya en orden cronológico real, ver
// el comentario de buildKmMarkers), los miembros alternan de lado -- rank
// par a un lado, impar al opuesto -- y cada pareja adicional se aleja un
// paso más para no solaparse entre sí en grupos de más de 2. Devuelve un
// desplazamiento {x,y} en píxeles por marcador (0,0 si no coincide con
// nadie). Pura -- trabaja en espacio de píxeles ya resuelto, sin
// Leaflet/DOM, para poder testearla sola.
export function resolveMarkerOffsets(points, directions, spacingPx) {

    const offsets = points.map(() => ({ x: 0, y: 0 }));
    const clusters = clusterByProximity(points, spacingPx);

    clusters.forEach(indices => {

        if (indices.length < 2) return;

        indices.forEach((pointIndex, rank) => {

            const side = rank % 2 === 0 ? 1 : -1;
            const magnitude = (Math.floor(rank / 2) + 0.5) * spacingPx;
            const axis = directions[pointIndex];

            offsets[pointIndex] = { x: axis.x * side * magnitude, y: axis.y * side * magnitude };

        });

    });

    return offsets;

}

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
// markers: array opcional de {lat, lon, km, dirA, dirB, paceSecPerKm, avgHr}
// -- marcas de km completo.
// arrows: array opcional de {lat, lon, dirA, dirB} -- flechas de sentido a
// lo largo del trazado (ayudan a confirmar visualmente en qué dirección se
// corrió, especialmente en rutas de ida y vuelta).
export async function mountRouteMap(container, segments, markers = [], arrows = []) {

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

    // Flechas de sentido -- ángulo calculado EN PÍXELES de pantalla (no en
    // lat/lon), convirtiendo los dos puntos "en bruto" que rodean cada
    // flecha (dirA/dirB, ver buildDirectionArrows) con la misma técnica que
    // ya usa el desplazamiento de marcas de km más abajo -- correcto sea
    // cual sea la proyección real del mapa en pantalla. atan2(dy,dx) da 0°
    // apuntando a la derecha, que es la orientación "de fábrica" del
    // triángulo CSS (.route-map-direction-arrow, ver RouteMap.css), así que
    // el ángulo se aplica tal cual, sin ningún offset de +90°.
    arrows.forEach(arrow => {

        const from = map.latLngToContainerPoint([arrow.dirA.lat, arrow.dirA.lon]);
        const to = map.latLngToContainerPoint([arrow.dirB.lat, arrow.dirB.lon]);
        const angleDeg = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;

        L.marker([arrow.lat, arrow.lon], {
            icon: L.divIcon({
                className: "route-map-direction-arrow-wrap",
                html: `<span class="route-map-direction-arrow" style="transform:translate(-50%, -50%) rotate(${angleDeg}deg)"></span>`,
                iconSize: [0, 0]
            }),
            interactive: false,
            keyboard: false
        }).addTo(map);

    });

    // El círculo solo muestra el número (especificación de cierre del Paso
    // 2: "no queremos duplicar el detalle del gráfico de abajo a la
    // vista") -- el ritmo/FC de ese km concreto vive en un popup al pulsar
    // (ver buildKmPopupHtml), no permanentemente en el mapa.
    //
    // resolveMarkerOffsets trabaja en píxeles de pantalla (no metros de
    // recorrido) -- un recorrido con giros o ida-y-vuelta puede traer dos km
    // distintos muy cerca EN EL MAPA aunque estén lejos en la ruta real;
    // comprobarlo sobre el mapa ya encuadrado es lo único que funciona igual
    // a cualquier zoom (bug real reportado: km 1/5 y 2/4 casi solapados).
    const markerPoints = markers.map(m => map.latLngToContainerPoint([m.lat, m.lon]));

    // Dirección local del recorrido en cada marca, calculada EN PÍXELES
    // (no en lat/lon) convirtiendo los dos puntos "en bruto" que la rodean
    // (dirA/dirB, ver buildKmMarkers) -- así el desplazamiento perpendicular
    // es correcto sea cual sea la proyección/rotación real del mapa en
    // pantalla, no una aproximación geográfica.
    const markerDirections = markers.map(marker => {

        const from = map.latLngToContainerPoint([marker.dirA.lat, marker.dirA.lon]);
        const to = map.latLngToContainerPoint([marker.dirB.lat, marker.dirB.lon]);

        const dx = to.x - from.x, dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;

        // Perpendicular (rotación 90°) al vector de avance del recorrido.
        return { x: -dy / len, y: dx / len };

    });

    const offsets = resolveMarkerOffsets(markerPoints, markerDirections, MIN_KM_MARKER_SPACING_PX);

    markers.forEach((marker, i) => {

        const { x, y } = offsets[i];

        // El desplazamiento va en un <span> INTERNO (route-map-km-marker),
        // nunca en el elemento que Leaflet posiciona (el de className) --
        // Leaflet aplica su propia transformación de posicionamiento ahí,
        // y una transform CSS propia en el mismo elemento se la pisaría por
        // completo, no solo la desplazaría.
        const leafletMarker = L.marker([marker.lat, marker.lon], {
            icon: L.divIcon({
                className: "route-map-km-marker-wrap",
                html: `<span class="route-map-km-marker" style="transform:translate(${x}px, ${y}px)">${marker.km}</span>`,
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
