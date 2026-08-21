import { formatISODate } from "../utils/date.js";
import { inferWorkoutType } from "./classifyWorkoutType.js";

const ACTIVITY_EXTENSION_NS = "http://www.garmin.com/xmlschemas/ActivityExtension/v2";

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

// Bloques tipo <AverageHeartRateBpm><Value>131</Value></AverageHeartRateBpm>
// — la etiqueta interna siempre es "Value", tanto a nivel Lap como Trackpoint.
function nestedValueOf(parent, tagName) {

    const el = parent?.getElementsByTagName(tagName)[0];
    return numberOf(el, "Value");

}

// AvgRunCadence/maxRunCadence viven en <ns3:LX>, namespace de la extensión
// de actividad de Garmin que Zepp reutiliza tal cual. getElementsByTagNameNS
// no resultó fiable (probado: no encuentra el elemento pese a que este
// reporta bien su namespaceURI/localName al inspeccionarlo directamente),
// así que se usa el prefijo literal "ns3:" — el que de verdad usan tanto
// Garmin como Zepp por compartir el mismo esquema — con un fallback manual
// por namespace URI real, no el método nativo, por si algún exportador
// usara otro alias de prefijo.
function nsTagValue(parent, localName) {

    if (!parent) return null;

    let el = parent.getElementsByTagName(`ns3:${localName}`)[0];

    if (!el) {
        el = [...parent.getElementsByTagName("*")]
            .find(node => node.localName === localName && node.namespaceURI === ACTIVITY_EXTENSION_NS);
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

function parseTrackpoints(lapEl) {

    return [...lapEl.getElementsByTagName("Trackpoint")].map(tp => {

        const time = textOf(tp, "Time");
        const posEl = tp.getElementsByTagName("Position")[0];
        const cadenceRaw = numberOf(tp, "Cadence");

        return {
            time: time ? new Date(time) : null,
            lat: numberOf(posEl, "LatitudeDegrees"),
            lon: numberOf(posEl, "LongitudeDegrees"),
            altitude: numberOf(tp, "AltitudeMeters"),
            hr: nestedValueOf(tp, "HeartRateBpm"),
            // La cadencia por Trackpoint viene de una sola pierna —
            // verificado contra un archivo real: la media de estos valores
            // ×2 coincide con AvgRunCadence del Lap (que ya viene doblado),
            // y el máximo ×2 coincide exacto con maxRunCadence.
            cadence: cadenceRaw != null ? cadenceRaw * 2 : null
        };

    });

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

// El TCX no trae splits nativos (un solo Lap para toda la actividad) — se
// calculan recorriendo los Trackpoints, acumulando distancia GPS
// (haversine entre puntos consecutivos) y cortando cada vez que se cruza
// un múltiplo de km, interpolando el instante exacto de cruce para que el
// ritmo de cada tramo sea preciso. La FC media por split (avgHr) sale gratis
// de los mismos Trackpoints, sin depender de una tabla aparte como en OCR.
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

export function parseTcxWorkout(xmlText) {

    const doc = new DOMParser().parseFromString(xmlText, "application/xml");

    if (doc.getElementsByTagName("parsererror")[0]) {
        throw new Error("El archivo TCX no se pudo leer — puede estar dañado o no ser un TCX válido.");
    }

    const activityEl = doc.getElementsByTagName("Activity")[0];
    const lapEl = doc.getElementsByTagName("Lap")[0];

    if (!activityEl || !lapEl) {
        throw new Error("El archivo TCX no tiene ninguna actividad reconocible.");
    }

    const startIso = textOf(activityEl, "Id") || lapEl.getAttribute("StartTime");
    const startDate = startIso ? new Date(startIso) : null;

    const distanceMeters = numberOf(lapEl, "DistanceMeters");
    const distanceKm = distanceMeters != null ? distanceMeters / 1000 : null;
    const durationSec = numberOf(lapEl, "TotalTimeSeconds");

    // El ritmo NO sale de <ns3:AvgSpeed> — verificado contra un archivo
    // real que ese campo no cuadra con la distancia/duración del propio
    // Lap (0.58 m/s declarado vs. 1.71 m/s real). Se deriva de los dos
    // datos que sí están verificados como fiables.
    const avgPaceSecPerKm = distanceKm > 0 && durationSec != null
        ? Math.round(durationSec / distanceKm)
        : null;

    const points = parseTrackpoints(lapEl);
    const firstFix = points.find(p => p.lat != null && p.lon != null);

    // Notes de Zepp no es un título descriptivo como el que capturan las
    // pantallas de Garmin (aquí es una etiqueta fija del modo de registro,
    // p. ej. "A pie·Instructor Zepp") — se deja en null a propósito y se
    // deja que inferWorkoutType() caiga a su heurística de distancia/splits.
    const title = null;
    const splits = computeSplits(points);

    const { type, confidence: typeConfidence } = inferWorkoutType({ title, distanceKm, splits });

    const fields = {
        date: startDate ? formatISODate(startDate) : null,
        time: startDate ? `${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, "0")}` : null,
        title,
        distanceKm,
        durationSec,
        avgPaceSecPerKm,
        avgHr: nestedValueOf(lapEl, "AverageHeartRateBpm"),
        maxHr: nestedValueOf(lapEl, "MaximumHeartRateBpm"),
        calories: numberOf(lapEl, "Calories"),
        // Ya vienen en SPM real (dobladas) a nivel de Lap — verificado
        // contra el archivo real, solo los valores por Trackpoint van por
        // pierna (ver parseTrackpoints).
        avgCadence: nsTagValue(lapEl, "AvgRunCadence"),
        maxCadence: nsTagValue(lapEl, "maxRunCadence"),
        elevationGainM: computeElevationGain(points),
        // No existe ningún campo de temperatura en TCX de Zepp/Amazfit.
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
