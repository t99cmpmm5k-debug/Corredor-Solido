// Fase 1 de Mapas: lista de tarjetas (una por entreno con GPS de
// CUALQUIER usuario), no un único mapa agregado con todo superpuesto --
// ver ComunidadMapasView.js. Función pura (recibe el array ya devuelto
// por /api/community/entrenos, no toca comunidadStore.js) para poder
// testear sin DOM ni Leaflet de por medio, mismo criterio que
// routeMapPaceColoring.js.

// Mismo umbral que hasRouteTrace() (RouteMap.js) y que el propio backend
// (community.js) ya aplica antes de mandar routeTrace -- repetido aquí a
// propósito, nunca confiar en que el filtro del servidor sea el único: si
// algún día cambia allí, esta lista no debe romperse con un único punto.
function hasRouteTrace(entreno) {
    return Array.isArray(entreno?.routeTrace) && entreno.routeTrace.length >= 2;
}

// Una tarjeta por ENTRENO (no por usuario) -- un mismo usuario con varios
// entrenos con GPS aparece varias veces en la lista, cada una con su
// propia fecha/mapa/stats. "Si un usuario no tiene ningún entreno con
// routeTrace, no aparece ninguna tarjeta suya" sale gratis de este mismo
// filtro -- nunca hay un hueco ni un error que mostrar por ese caso.
// Orden cronológico descendente (más reciente primero), mezclando
// entrenos de todos los usuarios en una sola lista -- date es "AAAA-MM-DD"
// (ver toPublicEntreno en server/src/routes/community.js), así que el
// orden lexicográfico ya coincide con el cronológico real.
export function buildCommunityRouteCards(entrenos) {

    return entrenos
        .filter(hasRouteTrace)
        .slice()
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

}
