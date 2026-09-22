import { colorForAlias } from "./communityMapColors.js";

// Bug real reportado: con usuarios reales geográficamente alejados (p. ej.
// Murcia y Almería, ~150km), el encuadre automático que los engloba a
// TODOS (fitBounds, ver mountRouteMap en RouteMap.js) deja cada recorrido
// individual como un punto minúsculo en vez de una línea legible -- el
// mapa deja de servir para lo que es. COMMUNITY_MAP_MIN_ZOOM pone un suelo
// (mountRouteMap solo lo usa para no alejarse MÁS de esta escala, nunca
// para acercar de más) a costa de que no todas las rutas quepan de
// entrada -- el propio pellizco (mapa interactivo) sigue permitiendo
// alejar del todo si hace falta. 12 -> escala de ciudad, un recorrido de
// unos pocos km ya se lee como línea real, no como punto.
export const COMMUNITY_MAP_MIN_ZOOM = 12;

// Centro de Región de Murcia (misma región que ya aparece primero en
// RACE_REGIONS, Carreras/carrerasStore.js) -- vista fija para cuando la
// comunidad todavía no tiene ningún entreno con GPS que encuadrar (no
// existe un "centro/zoom por defecto" real en el mapa individual que
// reutilizar: ese mapa simplemente no se muestra sin GPS, ver
// hasRouteTrace() en RunningDetailView.js).
export const COMMUNITY_MAP_DEFAULT_CENTER = [37.9922, -1.1307];

// Mismo umbral que hasRouteTrace() (RouteMap.js) y que el propio backend
// (community.js) ya aplica antes de mandar routeTrace -- repetido aquí a
// propósito, nunca confiar en que el filtro del servidor sea el único: si
// algún día cambia allí, este mapa no debe romperse con un único punto.
function hasRouteTrace(entreno) {
    return Array.isArray(entreno?.routeTrace) && entreno.routeTrace.length >= 2;
}

// Un segmento de polilínea por ENTRENO (no por usuario) -- un mismo
// usuario con varios entrenos con GPS pinta varias líneas del mismo color,
// mountRouteMap() (RouteMap.js) ya sabe dibujar cualquier cantidad de
// segmentos sin cambios. Punto 6 de la especificación ("si un usuario no
// tiene ningún entreno con routeTrace, no aparece") sale gratis de este
// mismo filtro -- nunca hay un hueco ni un error que mostrar por ese caso.
export function buildCommunitySegments(entrenos) {

    return entrenos
        .filter(hasRouteTrace)
        .map(entreno => ({
            latlngs: entreno.routeTrace.map(p => [p.lat, p.lon]),
            color: colorForAlias(entreno.alias)
        }));

}

// Una fila de leyenda por ALIAS (no por entreno) -- varios entrenos del
// mismo usuario no deben repetir su nombre varias veces en la leyenda.
// Orden alfabético para que la lista sea estable entre renders (el orden
// de llegada de /api/community/entrenos no tiene ningún significado).
export function buildCommunityLegendEntries(entrenos) {

    const aliases = new Set(entrenos.filter(hasRouteTrace).map(entreno => entreno.alias));

    return [...aliases]
        .sort((a, b) => a.localeCompare(b))
        .map(alias => ({ alias, color: colorForAlias(alias) }));

}
