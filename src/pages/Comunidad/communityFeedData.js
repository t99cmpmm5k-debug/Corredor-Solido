// Fase 3a de Comunidad: feed de Actividad -- a diferencia de
// buildCommunityRouteCards() (communityMapData.js, solo entrenos con GPS
// real), aquí van TODOS los entrenos de todos los usuarios, con o sin
// routeTrace (una Serie típicamente no lo tiene). Función pura, mismo
// criterio que communityMapData.js -- testear sin DOM ni Leaflet de por
// medio.

// Mismo criterio de orden que buildCommunityRouteCards() (date es
// "AAAA-MM-DD", el orden lexicográfico ya coincide con el cronológico
// real) -- duplicado a propósito en vez de compartir una función con
// communityMapData.js: es una única línea, no vale la pena una
// abstracción compartida por esto solo.
function sortByDateDescending(entrenos) {
    return entrenos.slice().sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

// typeFilter: "" (Todos) o uno de los ids reales de RUNNING_WORKOUT_TYPES
// (easy/long/series/race/tempo) -- "" o null/undefined no filtran nada.
export function buildCommunityFeedCards(entrenos, typeFilter = "") {

    const filtered = typeFilter ? entrenos.filter(e => e.type === typeFilter) : entrenos;

    return sortByDateDescending(filtered);

}
