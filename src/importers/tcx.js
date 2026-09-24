import { formatISODate } from "../utils/date.js";
import { inferWorkoutType, matchTitle } from "./classifyWorkoutType.js";
import { detectHeuristicIntervals, twoLevels } from "./intervalHeuristic.js";
import { haversineMeters, buildRouteTrace, sortPointsByTimeStable } from "./geoTrace.js";

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

// Bug real (2026-09-04, mismo patrón ya arreglado en gpx.js): distanceKm/
// durationSec salen de SUMAR el <DistanceMeters>/<TotalTimeSeconds> de
// cada Lap (ver parseTcxWorkout) -- sumar floats como 1000.0 + 1000.0 +
// 222.47 + ... arrastra ruido de punto flotante ("4257.719999999999" en
// vez de "4257.72"), visible en toda la UI que no vuelve a redondear por
// su cuenta (el input numérico de Revisar-datos, por ejemplo). No pasaba
// con un solo Lap (antes de sumar varios) porque ese único valor ya venía
// limpio de la fuente. El ritmo medio se calcula ANTES de este redondeo,
// sobre los valores completos, así que no pierde precisión por este paso.
function round2(n) {
    return n != null ? Math.round(n * 100) / 100 : null;
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
//
// Bug real (2026-09-04): un archivo real trae <ns3:MaxRunCadence> (M
// mayúscula) mientras el resto del código pedía "maxRunCadence" -- ambas
// coexisten según el exportador/versión de Zepp, así que la comparación de
// localName es insensible a mayúsculas/minúsculas (el prefijo "ns3:" en sí
// nunca cambia de caja, solo el nombre local).
function nsTagValue(parent, localName) {

    if (!parent) return null;

    let el = parent.getElementsByTagName(`ns3:${localName}`)[0];

    if (!el) {
        const target = localName.toLowerCase();
        el = [...parent.getElementsByTagName("*")]
            .find(node => node.localName?.toLowerCase() === target && node.namespaceURI === ACTIVITY_EXTENSION_NS);
    }

    if (!el) return null;

    const n = Number(el.textContent?.trim());
    return Number.isFinite(n) ? n : null;

}

// Media ponderada por duración de un campo agregado que cada <Lap> ya trae
// calculado por el propio dispositivo (AverageHeartRateBpm, AvgRunCadence)
// -- una media de medias sin ponderar pesaría igual un Lap de 282s que uno
// de 24s. Los Laps sin el campo (p. ej. cadencia ausente en algún archivo)
// se ignoran del todo, ni cuentan como 0 ni aportan su peso -- mismo
// criterio de "nunca inventar" que el resto del importador.
function weightedAverage(entries) {

    const withValue = entries.filter(e => e.value != null && e.weight > 0);
    if (!withValue.length) return null;

    const totalWeight = withValue.reduce((sum, e) => sum + e.weight, 0);
    const weightedSum = withValue.reduce((sum, e) => sum + e.value * e.weight, 0);

    return Math.round(weightedSum / totalWeight);

}

// Zepp firma sus TCX con <Author><Name>Zepp</Name> y un <Creator> Amazfit
// (ver el archivo real); Garmin Connect firma <Author> "Connect Api".
function isZeppExport(doc) {

    const author = textOf(doc.getElementsByTagName("Author")[0], "Name") ?? "";
    const creator = textOf(doc.getElementsByTagName("Creator")[0], "Name") ?? "";
    return /zepp/i.test(author) || /amazfit|zepp/i.test(creator);

}

function maxOf(values) {

    const real = values.filter(v => v != null);
    return real.length ? Math.max(...real) : null;

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
            cadence: cadenceRaw != null ? cadenceRaw * 2 : null,
            // Velocidad del sensor por punto (<ns3:TPX><ns3:Speed>, m/s) --
            // la trae Zepp; solo la usa la detección heurística de
            // intervalos (intervalHeuristic.js), y solo si el archivo no trae GPS.
            speed: nsTagValue(tp, "Speed")
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

// Vueltas MANUALES reales de Garmin (pista, "Series": Rafa marca cada
// repetición/descanso con el botón de vuelta del reloj) -- distinto del
// autolap automático por distancia (<TriggerMethod>Distance</TriggerMethod>,
// el de Rodaje/Tirada larga, ya cubierto arriba re-derivando splits de
// ~1km de los Trackpoints con computeSplits(): cortar por km ahí da el
// mismo resultado que las vueltas nativas de Garmin, así que nunca hizo
// falta leerlas). En una sesión de Series por km sí importa la diferencia:
// cortar por km mezclaría trabajo y descanso en bloques de ~1km sin
// relación con las repeticiones reales (bug real, ver commit).
//
// TriggerMethod es un ELEMENTO hijo del Lap (<TriggerMethod>Manual
// </TriggerMethod>), no un atributo -- ver el fixture real
// buildRealMultiLapTcx() de tcx.test.js. Ese mismo fixture es la prueba de
// por qué "todas las vueltas son manuales" NO basta como único criterio:
// es un rodaje normal con paradas de semáforo, TriggerMethod Manual en
// TODAS sus vueltas, y NO una sesión de series -- classifyManualLaps()
// exige además que las vueltas de descanso se parezcan entre sí (ver más
// abajo) precisamente para descartar casos así.
function isManualLapSeries(lapEls) {

    return lapEls.length > 1 && lapEls.every(lap => textOf(lap, "TriggerMethod") === "Manual");

}

// Como mínimo 2 vueltas de trabajo Y 2 de descanso reales para que tenga
// sentido hablar de una sesión de series estructurada -- una sola
// repetición, o una única parada suelta, no lo son.
const MIN_MANUAL_WORK_LAPS = 2;
const MIN_MANUAL_REST_LAPS = 2;

// Separación mínima (ritmo lento ÷ ritmo rápido) para fiarse del patrón --
// mismo umbral y mismo motivo que MIN_LEVEL_RATIO de intervalHeuristic.js
// (evita clasificar como "series" un Fartlek suave con vueltas parecidas
// entre sí), valor propio porque aquí se agrupan vueltas discretas reales,
// no velocidad continua suavizada -- no tiene por qué ser el mismo número.
const MIN_MANUAL_LAP_PACE_RATIO = 1.15;

// Cuánto pueden variar entre sí las vueltas de DESCANSO reales -- una
// sesión de series de verdad repite (más o menos) el mismo descanso
// programado cada vez (120,0s EXACTOS en el archivo real que verificó
// esto). Una parada suelta de un rodaje normal no se parece nada a la
// última vuelta remanente al parar el reloj (120,0s vs. 24,0s en
// buildRealMultiLapTcx, el fixture de regresión de tcx.test.js -- casi 5×
// de diferencia, aunque las dos caigan del lado "lento" del ritmo) --
// exigir que las vueltas de descanso sean parecidas ENTRE SÍ es lo que de
// verdad distingue un patrón de series real de un puñado de paradas
// irregulares con el mismo TriggerMethod. Sin un segundo archivo real de
// series que lo confirme, 1.5 es a propósito generoso (permite algo de
// variación real entre descansos) mientras sigue siendo mucho más estricto
// que ese 5× -- revisar contra un segundo archivo real si aparece.
const MAX_REST_DURATION_SPREAD_RATIO = 1.5;

// work/rest por el RITMO de cada vuelta real (duración ÷ distancia), no
// por su duración ni su distancia en solitario -- mismo principio que la
// heurística de Zepp (intervalHeuristic.js: separar rápido/lento en dos
// niveles, twoLevels() reutilizada tal cual), aplicado aquí a las vueltas
// discretas reales en vez de a la velocidad continua del GPS/sensor.
//
// Verificado con un archivo real de pista (activity_24485388688.tcx,
// 2026-09-24, 7 vueltas manuales): las de descanso caen en 120,0 s EXACTOS
// (Rafa suelta la vuelta al ver el crono llegar a 2:00) con ~220-290 m,
// mientras las de trabajo miden ~1000 m en 258,7-262,9 s -- pero fijarse
// solo en la DURACIÓN habría clasificado mal la última vuelta (515,7 m,
// 136,4 s: corta en tiempo, parecida a las de descanso) que en realidad es
// un último tramo de trabajo incompleto -- Rafa cortó la vuelta antes de
// completar el km, no fue un descanso. Su RITMO (264 s/km) lo delata:
// casi idéntico al de las vueltas de trabajo (258-263 s/km), muy lejos del
// de descanso (420-546 s/km). El ritmo, no la duración ni la distancia por
// separado, es la señal que clasifica las 7 vueltas correctamente; la
// consistencia de duración ENTRE las vueltas de descanso (ver
// MAX_REST_DURATION_SPREAD_RATIO) es la que descarta los falsos positivos.
function classifyManualLaps(laps) {

    if (laps.some(l => !(l.distanceKm > 0) || l.durationSec == null || l.durationSec <= 0)) return null;

    const paces = laps.map(l => l.durationSec / l.distanceKm);

    const [lowerPace, higherPace] = twoLevels(paces);
    if (!(lowerPace > 0) || higherPace / lowerPace < MIN_MANUAL_LAP_PACE_RATIO) return null;

    const threshold = (lowerPace + higherPace) / 2;
    const classified = laps.map((lap, i) => ({ ...lap, segmentType: paces[i] <= threshold ? "work" : "rest" }));

    const workLaps = classified.filter(l => l.segmentType === "work");
    const restLaps = classified.filter(l => l.segmentType === "rest");
    if (workLaps.length < MIN_MANUAL_WORK_LAPS || restLaps.length < MIN_MANUAL_REST_LAPS) return null;

    const restDurations = restLaps.map(l => l.durationSec);
    if (Math.max(...restDurations) / Math.min(...restDurations) > MAX_REST_DURATION_SPREAD_RATIO) return null;

    return classified;

}

// laps reales de una sesión de Series -- cada <Lap> ES un tramo real (no
// una interpolación de Trackpoints como computeSplits()), así que su
// avgHr/maxHr salen directos del propio Lap, igual que hace
// parseTcxWorkout() para los agregados del entreno completo.
function buildManualLapSplits(lapEls) {

    const laps = lapEls.map(lapEl => ({
        distanceKm: (numberOf(lapEl, "DistanceMeters") ?? 0) / 1000,
        durationSec: numberOf(lapEl, "TotalTimeSeconds"),
        avgHr: nestedValueOf(lapEl, "AverageHeartRateBpm"),
        maxHr: nestedValueOf(lapEl, "MaximumHeartRateBpm")
    }));

    const classified = classifyManualLaps(laps);
    if (!classified) return null;

    return classified.map((lap, index) => ({
        lap: index + 1,
        distanceKm: round2(lap.distanceKm),
        paceSecPerKm: Math.round(lap.durationSec / lap.distanceKm),
        avgHr: lap.avgHr,
        maxHr: lap.maxHr,
        segmentType: lap.segmentType
    }));

}

export function parseTcxWorkout(xmlText) {

    const doc = new DOMParser().parseFromString(xmlText, "application/xml");

    if (doc.getElementsByTagName("parsererror")[0]) {
        throw new Error("El archivo TCX no se pudo leer — puede estar dañado o no ser un TCX válido.");
    }

    const activityEl = doc.getElementsByTagName("Activity")[0];
    // Bug real (2026-09-04): una actividad puede venir partida en VARIOS
    // <Lap> — cada parón real (semáforo, pausa manual...) cierra uno y abre
    // el siguiente, con duración/distancia irregulares entre sí (un Lap de
    // 1000m tan real como uno de 222m o 35m). Antes solo se leía
    // `getElementsByTagName("Lap")[0]`, así que un archivo con 6 Laps se
    // importaba como si solo existiera el primero -- verificado contra un
    // TCX real de 4,26km repartido en 6 Laps que se importaba como 1,00km.
    // Ningún Lap se descarta por corto o irregular que sea.
    const lapEls = [...doc.getElementsByTagName("Lap")];

    if (!activityEl || lapEls.length === 0) {
        throw new Error("El archivo TCX no tiene ninguna actividad reconocible.");
    }

    const startIso = textOf(activityEl, "Id") || lapEls[0].getAttribute("StartTime");
    const startDate = startIso ? new Date(startIso) : null;

    // Distancia/duración/calorías: suma directa de lo que cada Lap ya trae
    // calculado por el propio dispositivo -- estos tres son aditivos sin
    // matices (a diferencia de FC/cadencia, que son medias y no se pueden
    // simplemente sumar).
    const distanceMeters = lapEls.reduce((sum, lap) => sum + (numberOf(lap, "DistanceMeters") ?? 0), 0) || null;
    const distanceKm = distanceMeters != null ? distanceMeters / 1000 : null;
    const durationSec = lapEls.reduce((sum, lap) => sum + (numberOf(lap, "TotalTimeSeconds") ?? 0), 0) || null;
    const calories = lapEls.reduce((sum, lap) => sum + (numberOf(lap, "Calories") ?? 0), 0) || null;

    // El ritmo NO sale de <ns3:AvgSpeed> — verificado contra un archivo
    // real que ese campo no cuadra con la distancia/duración del propio
    // Lap (0.58 m/s declarado vs. 1.71 m/s real). Se deriva de los dos
    // datos que sí están verificados como fiables.
    const avgPaceSecPerKm = distanceKm > 0 && durationSec != null
        ? Math.round(durationSec / distanceKm)
        : null;

    // FC media y cadencia media: cada Lap ya trae su propia media calculada
    // por el dispositivo -- combinarlas exige ponderar por duración (ver
    // weightedAverage()), nunca una media de medias sin pesos ni tampoco
    // recalcularlas desde cero a partir de los Trackpoints sueltos (que
    // pueden traer huecos de FC/cadencia el dispositivo ya tuvo en cuenta).
    // FC máxima/cadencia máxima sí son directamente el máximo entre Laps.
    const avgHr = weightedAverage(lapEls.map(lap => ({
        value: nestedValueOf(lap, "AverageHeartRateBpm"),
        weight: numberOf(lap, "TotalTimeSeconds") ?? 0
    })));
    const maxHr = maxOf(lapEls.map(lap => nestedValueOf(lap, "MaximumHeartRateBpm")));

    // Bug real (2026-09-23): el esquema ActivityExtension/v2 define
    // AvgRunCadence/MaxRunCadence por pierna (zancadas/min), y así lo
    // exporta Garmin Connect -- verificado contra un TCX real de un
    // Forerunner 970 con AvgRunCadence 86-88 por Lap mientras Garmin
    // Connect muestra 175 ppm para ese mismo entreno. Zepp se aparta del
    // esquema y ya lo trae doblado (verificado contra su archivo real: la
    // media por Trackpoint ×2 cuadra con su AvgRunCadence). Se dobla por
    // defecto y solo se exime a Zepp; se dobla cada Lap ANTES de ponderar
    // para no perder la resolución impar (175, no solo pares).
    const lapCadenceFactor = isZeppExport(doc) ? 1 : 2;
    const lapCadence = (lap, tag) => {
        const v = nsTagValue(lap, tag);
        return v != null ? v * lapCadenceFactor : null;
    };
    const avgCadence = weightedAverage(lapEls.map(lap => ({
        value: lapCadence(lap, "AvgRunCadence"),
        weight: numberOf(lap, "TotalTimeSeconds") ?? 0
    })));
    const maxCadence = maxOf(lapEls.map(lap => lapCadence(lap, "maxRunCadence")));

    // Puntos GPS de TODOS los Laps -- de aquí salen elevación, splits y la
    // traza de recorrido de la actividad completa, no solo del primer Lap.
    // Reordenados por <Time> real, no por el orden de aparición de los
    // propios Laps/Trackpoints en el archivo -- ver el comentario junto a
    // sortPointsByTimeStable en geoTrace.js.
    const rawPoints = lapEls.flatMap(lap => parseTrackpoints(lap));
    const points = sortPointsByTimeStable(rawPoints);
    const firstFix = points.find(p => p.lat != null && p.lon != null);

    // Notes de Zepp no es un título descriptivo como el que capturan las
    // pantallas de Garmin (aquí es una etiqueta fija del modo de registro,
    // p. ej. "A pie·Instructor Zepp") — se deja en null a propósito y se
    // deja que inferWorkoutType() caiga a su heurística de distancia/splits.
    // Excepción: el modo "Series" de Zepp (<Notes>Series</Notes>, verificado
    // en un archivo real) sí dice qué entreno fue -- clasifica el tipo.
    const title = null;
    const notes = textOf(activityEl, "Notes");
    const isSeriesByNotes = matchTitle(notes) === "series";

    // Series sin vueltas reales (Zepp exporta toda la sesión en un único
    // <Lap>, aunque el reloj guiara 4×3'/2'): intervalos estimados por
    // velocidad (intervalHeuristic.js, tramos marcados isHeuristic). Con
    // varias vueltas no se entra aquí; sin patrón claro, splits por km.
    const heuristic = isSeriesByNotes && lapEls.length === 1 ? detectHeuristicIntervals(points) : null;

    // Series CON vueltas reales manuales (Garmin, no Zepp): las vueltas del
    // propio archivo, sin recortar por km ni estimar nada -- ver
    // isManualLapSeries()/buildManualLapSplits() más arriba. Se prueba
    // antes que computeSplits() pero después de la heurística de Zepp (que
    // ya exige un único Lap, así que las dos ramas nunca compiten).
    const manualLaps = !isZeppExport(doc) && isManualLapSeries(lapEls) ? buildManualLapSplits(lapEls) : null;

    const splits = heuristic?.splits ?? manualLaps ?? computeSplits(points);

    const { type, confidence: typeConfidence } = inferWorkoutType({ title: isSeriesByNotes ? notes : title, distanceKm, splits });

    const fields = {
        date: startDate ? formatISODate(startDate) : null,
        time: startDate ? `${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, "0")}` : null,
        title,
        distanceKm: round2(distanceKm),
        durationSec: durationSec != null ? Math.round(durationSec) : null,
        avgPaceSecPerKm,
        avgHr,
        maxHr,
        calories,
        avgCadence,
        maxCadence,
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

    // Traza re-muestreada para la detección automática de recorridos
    // parecidos (referenceRouteGeometry.js) -- fuera de `fields`/fieldMeta
    // a propósito, igual que `splits`: no es un dato que se revise ni edite
    // a mano en Revisar-datos. null si el archivo no trae GPS real.
    const routeTrace = buildRouteTrace(points);

    return {

        ...fields,
        type,
        splits,
        routeTrace,

        fieldMeta,
        importWarnings

    };

}
