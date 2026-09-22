// Color por usuario en el mapa agregado (Fase 1, punto 4) -- un hash
// simple del alias en vez de guardar un color en el backend: el mismo
// alias produce siempre el mismo hue, en cualquier sesión y sin tocar el
// servidor. Saturación/luminosidad fijas (solo cambia el hue) para que
// todos los colores destaquen igual de bien sobre el terreno oscuro del
// mapa -- ver TERRAIN_TILE_URL en RouteMap.js.
function hashString(str) {

    let hash = 0;

    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }

    return hash;

}

export function colorForAlias(alias) {

    const hue = Math.abs(hashString(String(alias))) % 360;

    return `hsl(${hue}, 72%, 58%)`;

}
