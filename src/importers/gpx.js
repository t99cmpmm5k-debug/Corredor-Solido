import { formatISODate } from "../utils/date.js";
import { inferWorkoutType } from "./classifyWorkoutType.js";

const TRACKPOINT_EXTENSION_NS = "http://www.garmin.com/xmlschemas/TrackPointExtension/v1";

function textOf(parent, tagName) {

    if (!parent) return null;

    const el = parent.getElementsByTagName(tagName)[0];
    const text = el?.textContent?.trim();

    return text || null;

}

function numberOf(parent, tagName) {

    const text = textOf(parent, tagName);
    if (text == null) return null;

    const n = Number(text);
    return Number.isFinite(n) ? n : null;

}

function numberFromAttr(el, attr) {

    const raw = el?.getAttribute(attr);
    if (raw == null) return null;

    const n = Number(raw);
    return Number.isFinite(n) ? n : null;

}

// hr/cad viven en <extensions><gpxtpx:TrackPointExtension> — extensión de
// Garmin que reutilizan otros exportadores tal cual (mismo caso que ns3:LX
// en tcx.js). getElementsByTagNameNS no resultó fiable ahí, así que aquí
// también se usa el prefijo literal "gpxtpx:" con fallback manual por
// namespace URI real, por si algún exportador usara otro alias de prefijo.
function nsChildValue(parent, prefix, localName) {

    if (!parent) return null;

    let el = parent.getElementsByTagName(`${prefix}:${localName}`)[0];

    if (!el) {
        el = [...parent.getElementsByTagName("*")]
            .find(node => node.localName === localName && node.namespaceURI === TRACKPOINT_EXTENSION_NS);
    }

    if (!el) return null;

    const n = Number(el.textContent?.trim());
    return Number.isFinite(n) ? n : null;

}

function haversineMeters(lat1, lon1, lat2, lon2) {

    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

}

function parseTrackpoints(trkEl) {

    return [...trkEl.getElementsByTagName("trkpt")].map(tp => {

        const time = textOf(tp, "time");
        const cadenceRaw = nsChildValue(tp, "gpxtpx", "cad");

        return {
            time: time ? new Date(time) : null,
            lat: numberFromAttr(tp, "lat"),
            lon: numberFromAttr(tp, "lon"),
            altitude: numberOf(tp, "ele"),
            hr: nsChildValue(tp, "gpxtpx", "hr"),
            // gpxtpx:cad es la misma extensión de Garmin que en TCX aporta la
            // cadencia por Trackpoint (dato por una sola pierna, ver
            // tcx.js) — se aplica el mismo factor x2 por analogía, pero sin
            // un GPX real todavía contra el que confirmarlo. Revisar en
            // cuanto se pueda comparar con un archivo real.
            cadence: cadenceRaw != null ? cadenceRaw * 2 : null
        };

    });

}

function average(values) {
    return values.length ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null;
}

function maxOf(values) {
    return values.length ? Math.max(...values) : null;
}

function computeDistanceMeters(points) {

    let total = 0;

    for (let i = 1; i < points.length; i++) {

        const prev = points[i - 1], curr = points[i];
        if (prev.lat == null || prev.lon == null || curr.lat == null || curr.lon == null) continue;

        total += haversineMeters(prev.lat, prev.lon, curr.lat, curr.lon);

    }

    return total;

}

function computeElevationGain(points) {

    let gain = 0;

    for (let i = 1; i < points.length; i++) {

        const prev = points[i - 1].altitude, curr = points[i].altitude;
        if (prev == null || curr == null) continue;

        const delta = curr - prev;
        if (delta > 0) gain += delta;

    }

    return gain > 0 ? Math.round(gain) : null;

}

// El GPX no trae ni distancia ni parciales nativos (solo puntos sueltos) —
// se calculan recorriendo los trackpoints igual que en tcx.js: distancia
// GPS acumulada (haversine entre puntos consecutivos), cortando cada vez
// que se cruza un múltiplo de km e interpolando el instante exacto de
// cruce. La FC media por split sale gratis de los mismos puntos.
function computeSplits(points) {

    const KM = 1000;
    const splits = [];

    let cumDistance = 0;
    let splitStartDistance = 0;
    let splitStartTime = points.find(p => p.time)?.time ?? null;
    let nextSplitAt = KM;
    let lap = 1;
    let hrSamples = [];

    function pushSplit(distanceMeters, endTime) {

        const distanceKm = distanceMeters / 1000;
        const durationSec = splitStartTime && endTime
            ? (endTime.getTime() - splitStartTime.getTime()) / 1000
            : null;

        const avgHr = hrSamples.length
            ? Math.round(hrSamples.reduce((sum, v) => sum + v, 0) / hrSamples.length)
            : null;

        splits.push({
            lap,
            distanceKm,
            paceSecPerKm: durationSec != null && durationSec > 0 && distanceKm > 0
                ? Math.round(durationSec / distanceKm)
                : null,
            avgHr
        });

        lap += 1;
        hrSamples = [];

    }

    for (let i = 1; i < points.length; i++) {

        const prev = points[i - 1], curr = points[i];
        if (curr.hr != null) hrSamples.push(curr.hr);

        if (prev.lat == null || prev.lon == null || curr.lat == null || curr.lon == null) continue;

        const segmentDistance = haversineMeters(prev.lat, prev.lon, curr.lat, curr.lon);
        const segmentStart = cumDistance;
        cumDistance += segmentDistance;

        while (cumDistance >= nextSplitAt) {

            const ratio = segmentDistance > 0 ? (nextSplitAt - segmentStart) / segmentDistance : 0;
            const prevTime = prev.time, currTime = curr.time ?? prev.time;
            const crossTime = prevTime && currTime
                ? new Date(prevTime.getTime() + (currTime.getTime() - prevTime.getTime()) * ratio)
                : (currTime ?? prevTime);

            pushSplit(nextSplitAt - splitStartDistance, crossTime);

            splitStartDistance = nextSplitAt;
            splitStartTime = crossTime;
            nextSplitAt += KM;

        }

    }

    // Remanente final (<1km) — mismo criterio que RunningDetailView.js ya
    // aplica al filtrar el último split corto de las capturas de Garmin.
    if (cumDistance - splitStartDistance > 1) {
        const lastTime = points[points.length - 1]?.time ?? splitStartTime;
        pushSplit(cumDistance - splitStartDistance, lastTime);
    }

    return splits;

}

export function parseGpxWorkout(xmlText) {

    const doc = new DOMParser().parseFromString(xmlText, "application/xml");

    if (doc.getElementsByTagName("parsererror")[0]) {
        throw new Error("El archivo GPX no se pudo leer — puede estar dañado o no ser un GPX válido.");
    }

    const trkEl = doc.getElementsByTagName("trk")[0];
    const points = trkEl ? parseTrackpoints(trkEl) : [];

    if (!trkEl || !points.length) {
        throw new Error("El archivo GPX no tiene ningún recorrido reconocible.");
    }

    const metadataEl = doc.getElementsByTagName("metadata")[0];
    const metaTime = textOf(metadataEl, "time");
    const firstPointTime = points.find(p => p.time)?.time ?? null;
    const startDate = metaTime ? new Date(metaTime) : firstPointTime;

    const timedPoints = points.filter(p => p.time);
    const durationSec = timedPoints.length >= 2
        ? (timedPoints[timedPoints.length - 1].time.getTime() - timedPoints[0].time.getTime()) / 1000
        : null;

    const distanceMeters = computeDistanceMeters(points);
    const distanceKm = distanceMeters > 0 ? distanceMeters / 1000 : null;

    const avgPaceSecPerKm = distanceKm > 0 && durationSec != null
        ? Math.round(durationSec / distanceKm)
        : null;

    const hrValues = points.map(p => p.hr).filter(v => v != null);
    const cadenceValues = points.map(p => p.cadence).filter(v => v != null);
    const firstFix = points.find(p => p.lat != null && p.lon != null);

    // <trk><name> sí suele traer un título real (a diferencia del Notes fijo
    // de Zepp en TCX, ver tcx.js) — se deja pasar tal cual a
    // inferWorkoutType(), que ya ignora lo que no reconoce.
    const title = textOf(trkEl, "name");
    const splits = computeSplits(points);

    const { type, confidence: typeConfidence } = inferWorkoutType({ title, distanceKm, splits });

    const fields = {
        date: startDate ? formatISODate(startDate) : null,
        time: startDate ? `${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, "0")}` : null,
        title,
        distanceKm,
        durationSec,
        avgPaceSecPerKm,
        // Sin Lap agregado como en TCX — FC y cadencia medias/máximas salen
        // de recorrer los propios trackpoints.
        avgHr: average(hrValues),
        maxHr: maxOf(hrValues),
        // El estándar GPX no tiene campo de calorías (a diferencia de TCX).
        calories: null,
        avgCadence: average(cadenceValues),
        maxCadence: maxOf(cadenceValues),
        elevationGainM: computeElevationGain(points),
        // Tampoco hay campo de temperatura en GPX.
        temperatureC: null,
        startLat: firstFix?.lat ?? null,
        startLon: firstFix?.lon ?? null
    };

    // Al ser XML estructurado no hay confianza de OCR que propagar — es
    // binario: el campo se leyó (1) o no estaba en el archivo (0).
    const fieldMeta = {};
    Object.keys(fields).forEach(key => {
        fieldMeta[key] = { confidence: fields[key] != null ? 1 : 0, corrected: false };
    });
    fieldMeta.type = { confidence: typeConfidence, corrected: false };

    const importWarnings = [];
    if (!fields.date) {
        importWarnings.unshift("No se detectó la fecha del entrenamiento — indícala tú abajo.");
    }
    if (fields.elevationGainM != null && fields.elevationGainM > 3000) {
        importWarnings.push("El desnivel calculado por GPS parece muy alto — revisar.");
    }

    return {

        ...fields,
        type,
        splits,

        fieldMeta,
        importWarnings

    };

}
