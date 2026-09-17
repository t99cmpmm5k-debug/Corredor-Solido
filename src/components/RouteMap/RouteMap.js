import "./RouteMap.css";

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

// Tamaño real del círculo de marca de km -- debe coincidir EXACTO con
// .route-map-km-marker (RouteMap.css, box-sizing:border-box) para que
// iconAnchor centre bien el círculo sobre su coordenada.
const KM_MARKER_SIZE_PX = 18;

// Separación mínima en PÍXELES DE PANTALLA (no metros de recorrido) entre
// dos marcas de km ya colocadas -- un recorrido con giros o ida-y-vuelta
// puede traer dos kilómetros distintos muy cerca EN EL MAPA aunque estén
// lejos en la ruta real (bug real reportado: km 1/5 y km 2/4 casi
// solapados). Comprobar la distancia sobre el propio mapa ya encuadrado
// (en vez de una distancia fija en metros) es lo único que funciona igual
// de bien a cualquier zoom, porque el zoom final depende de la extensión
// real de cada recorrido y varía de un entreno a otro.
const MIN_KM_MARKER_SPACING_PX = KM_MARKER_SIZE_PX + 6;

// Descarta marcas demasiado cerca de otra ya colocada, en el orden en que
// llegan (kilómetro más bajo gana el hueco) -- greedy simple, no busca el
// reparto "óptimo", solo garantiza que nunca queden dos pegadas. Exportada
// para poder testearla sin Leaflet/DOM de por medio (recibe puntos en
// espacio de píxeles ya resueltos, no coordenadas geográficas).
export function declutterMarkers(points, minSpacingPx) {

    const keptIndices = [];
    const keptPoints = [];

    points.forEach((point, i) => {

        const overlaps = keptPoints.some(p => Math.hypot(p.x - point.x, p.y - point.y) < minSpacingPx);

        if (!overlaps) {
            keptPoints.push(point);
            keptIndices.push(i);
        }

    });

    return keptIndices;

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
// markers: array opcional de {lat, lon, km} -- marcas de km completo.
export async function mountRouteMap(container, segments, markers = []) {

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
    const map = L.map(container, {
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
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
    // frontera que ambos comparten.
    segments.forEach(segment => {

        L.polyline(segment.latlngs, {
            color: ROUTE_LINE_CASING_COLOR,
            weight: 8,
            opacity: 0.85,
            lineCap: "round",
            lineJoin: "round"
        }).addTo(map);

    });

    segments.forEach(segment => {

        L.polyline(segment.latlngs, {
            color: segment.color,
            weight: 5,
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

    // Sin popup/tooltip ni interacción -- solo el número, especificación de
    // cierre del Paso 2 ("el detalle de ritmo ya vive en el gráfico de
    // abajo, no queremos duplicar información aquí"). declutterMarkers
    // trabaja en píxeles de pantalla (no metros de recorrido) -- un
    // recorrido con giros o ida-y-vuelta puede traer dos km distintos muy
    // cerca EN EL MAPA aunque estén lejos en la ruta real; comprobarlo
    // sobre el mapa ya encuadrado es lo único que funciona igual a
    // cualquier zoom (bug real reportado: km 1/5 y 2/4 casi solapados).
    const markerPoints = markers.map(m => map.latLngToContainerPoint([m.lat, m.lon]));
    const keptIndices = declutterMarkers(markerPoints, MIN_KM_MARKER_SPACING_PX);

    keptIndices.forEach(i => {

        const marker = markers[i];

        L.marker([marker.lat, marker.lon], {
            icon: L.divIcon({
                className: "route-map-km-marker",
                html: `<span>${marker.km}</span>`,
                iconSize: [KM_MARKER_SIZE_PX, KM_MARKER_SIZE_PX],
                iconAnchor: [KM_MARKER_SIZE_PX / 2, KM_MARKER_SIZE_PX / 2]
            }),
            interactive: false,
            keyboard: false
        }).addTo(map);

    });

    return map;

}

export function unmountRouteMap(map) {
    map?.remove();
}
