// Utilidades de geometría GPS compartidas entre los importadores con
// trazado real (tcx.js, gpx.js) y la detección de recorridos parecidos
// (referenceRouteGeometry.js). haversineMeters vivía duplicado idéntico en
// tcx.js y gpx.js -- con un tercer consumidor (la comparación de
// recorridos) tocaba juntarlo en un solo sitio.

export function haversineMeters(lat1, lon1, lat2, lon2) {

    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

}

// Paso del re-muestreo por distancia recorrida (no por nº de puntos ni por
// tiempo) -- normaliza dos grabaciones del mismo recorrido hechas con
// relojes/frecuencias de muestreo distintas (un TCX de Amazfit y un GPX de
// Garmin no traen la misma densidad de puntos) a una traza comparable.
// También acota el tamaño: una traza cruda puede tener 2000-3000 puntos
// (verificado contra un TCX y dos GPX reales), re-muestreada a este paso
// una tirada de 10km queda en ~500 puntos -- manejable para comparar en el
// navegador sin backend.
export const ROUTE_TRACE_STEP_METERS = 20;

// Re-muestrea una lista de puntos {lat, lon, ...} (se ignoran otros campos)
// a intervalos fijos de distancia recorrida, interpolando linealmente entre
// los dos puntos crudos que rodean cada marca -- mismo criterio que ya usa
// computeSplits() en tcx.js/gpx.js para interpolar el instante de cruce de
// cada km, aplicado aquí a lat/lon en vez de a tiempo. Devuelve null si no
// hay al menos 2 puntos con GPS real (nada que trazar).
export function buildRouteTrace(points, stepMeters = ROUTE_TRACE_STEP_METERS) {

    const fixed = points.filter(p => p.lat != null && p.lon != null);
    if (fixed.length < 2) return null;

    const trace = [{ lat: fixed[0].lat, lon: fixed[0].lon }];

    let cumDistance = 0;
    let nextMark = stepMeters;

    for (let i = 1; i < fixed.length; i++) {

        const prev = fixed[i - 1], curr = fixed[i];
        const segmentDistance = haversineMeters(prev.lat, prev.lon, curr.lat, curr.lon);
        if (segmentDistance === 0) continue;

        const segmentStart = cumDistance;
        cumDistance += segmentDistance;

        while (cumDistance >= nextMark) {

            const ratio = (nextMark - segmentStart) / segmentDistance;

            trace.push({
                lat: prev.lat + (curr.lat - prev.lat) * ratio,
                lon: prev.lon + (curr.lon - prev.lon) * ratio
            });

            nextMark += stepMeters;

        }

    }

    const last = fixed[fixed.length - 1];
    const lastInTrace = trace[trace.length - 1];

    if (lastInTrace.lat !== last.lat || lastInTrace.lon !== last.lon) {
        trace.push({ lat: last.lat, lon: last.lon });
    }

    return trace;

}
