// Detección heurística de intervalos (series) a partir de la velocidad
// segundo a segundo -- para relojes que NUNCA exportan las vueltas reales
// de un entreno estructurado. Verificado con archivos reales de
// Zepp/Amazfit: toda la sesión llega como un único <Lap> (TCX) o <trkseg>
// (GPX), aunque el reloj guiara 4×3'/2'. Garmin sí exporta sus vueltas;
// quien llame solo debe usar esto cuando el archivo no trae ninguna.
//
// Es una ESTIMACIÓN, nunca un dato leído del reloj: cada tramo sale
// marcado isHeuristic: true (ver intervalDetection.js y el badge de
// RunningDetailView.js).
//
// Método, a propósito simple y con umbrales con nombre:
// 1) Velocidad por segundo derivada de la distancia GPS acumulada (ver
//    gpsGridSpeed); la del sensor (ns3:speed / ns3:Speed) solo si el
//    archivo no trae posiciones (p. ej. cinta). Verificado con las dos
//    sesiones reales de Zepp: el ritmo por serie sale igual con ambas
//    (±7 s/km), pero la del sensor tarda en bajar y alarga cada serie 5-13 s
//    más allá de lo programado; con GPS el error medio es de 3-4 s.
//    Rejilla fija de 1s -- los archivos reales traen timestamps repetidos y
//    huecos sueltos.
// 2) Media móvil centrada (SMOOTHING_WINDOW_SEC) -- quita el ruido sin
//    desplazar los cambios de ritmo (una ventana centrada es simétrica).
// 3) Dos niveles de ritmo de la propia sesión (k-means de 2 grupos sobre la
//    velocidad suavizada) y umbral a mitad de camino -- sin ritmos fijos,
//    vale igual para series a 5:40 que a 6:20. Si los dos niveles no se
//    separan lo bastante (MIN_LEVEL_RATIO), no hay series que detectar.
// 4) "work" = tramo rápido de al menos MIN_WORK_SEC. "rest" = todo lo que
//    queda entre dos "work". Lo anterior al primer "work" (calentamiento)
//    y lo posterior al último (enfriamiento) queda fuera, igual que la
//    pantalla "Intervalos" de Garmin (parser-intervals.js).
import { haversineMeters } from "./geoTrace.js";

const SMOOTHING_WINDOW_SEC = 15;
const MIN_WORK_SEC = 60;
const MIN_WORK_SEGMENTS = 2;
const MIN_LEVEL_RATIO = 1.15;
// Por debajo, parado (semáforo, reloj esperando GPS) -- no cuenta para
// calcular los dos niveles de ritmo.
const STOPPED_SPEED_MS = 0.5;
// Proporción mínima de puntos con posición para derivar la velocidad del
// GPS; por debajo, se recurre a la del sensor.
const GPS_MIN_COVERAGE = 0.8;

function toSeconds(date) {

    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() / 1000 : null;

}

function hasGpsTrack(points) {

    const withPosition = points.filter(p => p.lat != null && p.lon != null).length;
    return points.length > 0 && withPosition / points.length >= GPS_MIN_COVERAGE;

}

// FC por segundo (media de los puntos de ese segundo, null si ninguno) y la
// longitud de la rejilla de 1s desde el primer punto.
function gridBase(points) {

    const t0 = toSeconds(points[0].time);
    const length = Math.floor(toSeconds(points[points.length - 1].time) - t0) + 1;

    const hrSum = new Array(length).fill(0), hrCount = new Array(length).fill(0);

    points.forEach(p => {
        const index = Math.min(length - 1, Math.max(0, Math.floor(toSeconds(p.time) - t0)));
        if (p.hr != null) { hrSum[index] += p.hr; hrCount[index]++; }
    });

    return { t0, length, hr: hrSum.map((sum, i) => hrCount[i] ? sum / hrCount[i] : null) };

}

// Sensor: media de los puntos de cada segundo; segundos sin ningún punto
// (huecos sueltos del archivo) con el último valor conocido.
function sensorGridSpeed(points, { t0, length }) {

    const sum = new Array(length).fill(0), count = new Array(length).fill(0);

    points.forEach(p => {
        if (p.speed == null) return;
        const index = Math.min(length - 1, Math.max(0, Math.floor(toSeconds(p.time) - t0)));
        sum[index] += p.speed; count[index]++;
    });

    let last = null;
    const speed = sum.map((v, i) => (last = count[i] ? v / count[i] : last));
    const firstKnown = speed.find(v => v != null) ?? 0;

    return speed.map(v => v ?? firstKnown);

}

// GPS: distancia acumulada (haversine) interpolada en cada segundo, y la
// velocidad como su diferencia -- NO distancia/tiempo punto a punto: los
// archivos reales de Zepp repiten timestamps (dos puntos distintos en el
// mismo segundo, seguidos de un hueco) y ese cociente se dispara o se
// anula justo ahí (bug real encontrado al verificar: una serie de 479 m
// salía de 535 m). Así la suma de la rejilla es exactamente la distancia GPS.
function gpsGridSpeed(points, { t0, length }) {

    const samples = [];
    let cumulative = 0, prev = null;

    points.forEach(p => {

        if (p.lat == null || p.lon == null) return;
        if (prev) cumulative += haversineMeters(prev.lat, prev.lon, p.lat, p.lon);
        prev = p;

        const t = toSeconds(p.time) - t0;
        const last = samples[samples.length - 1];
        if (last && last.t === t) last.d = cumulative;
        else samples.push({ t, d: cumulative });

    });

    if (samples.length < 2) return new Array(length).fill(0);

    let j = 0;
    const distanceAt = t => {
        while (j < samples.length - 2 && samples[j + 1].t < t) j++;
        const a = samples[j], b = samples[j + 1];
        if (t <= a.t) return a.d;
        if (t >= b.t) return b.d;
        return a.d + (b.d - a.d) * (t - a.t) / (b.t - a.t);
    };

    const cumulativeAt = Array.from({ length: length + 1 }, (_, i) => distanceAt(i));
    return cumulativeAt.slice(1).map((d, i) => d - cumulativeAt[i]);

}

function movingAverage(values, window) {

    const half = Math.floor(window / 2);
    const prefix = [0];
    values.forEach(v => prefix.push(prefix[prefix.length - 1] + v));

    return values.map((_, i) => {
        const from = Math.max(0, i - half), to = Math.min(values.length, i + half + 1);
        return (prefix[to] - prefix[from]) / (to - from);
    });

}

function percentile(sorted, q) {

    return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

}

// k-means 1D con 2 grupos -- devuelve [valor bajo, valor alto] (aquí,
// velocidad: [lento, rápido]). Exportada: tcx.js la reutiliza tal cual
// para separar trabajo/descanso por RITMO en vueltas manuales reales de
// Garmin (distinto caso de uso -- ver comentario junto a su uso allí --
// pero el mismo agrupamiento en dos niveles, sin duplicar el algoritmo).
export function twoLevels(values) {

    const sorted = [...values].sort((a, b) => a - b);
    let slow = percentile(sorted, 0.25), fast = percentile(sorted, 0.75);

    for (let iteration = 0; iteration < 30; iteration++) {

        const threshold = (slow + fast) / 2;
        const low = values.filter(v => v < threshold), high = values.filter(v => v >= threshold);
        if (!low.length || !high.length) break;

        const nextSlow = low.reduce((s, v) => s + v, 0) / low.length;
        const nextFast = high.reduce((s, v) => s + v, 0) / high.length;
        if (nextSlow === slow && nextFast === fast) break;

        slow = nextSlow; fast = nextFast;

    }

    return [slow, fast];

}

function runsOf(flags) {

    const runs = [];
    let start = 0;

    for (let i = 1; i <= flags.length; i++) {
        if (i === flags.length || flags[i] !== flags[start]) {
            runs.push({ fast: flags[start], start, end: i });
            start = i;
        }
    }

    return runs;

}

function buildSegment(type, start, end, grid) {

    const durationSec = end - start;
    const distanceMeters = grid.speed.slice(start, end).reduce((s, v) => s + v, 0);
    const hrValues = grid.hr.slice(start, end).filter(v => v != null);

    return {
        segmentType: type,
        startSec: start,
        durationSec,
        distanceKm: Math.round(distanceMeters) / 1000,
        paceSecPerKm: distanceMeters > 0 ? Math.round(durationSec / (distanceMeters / 1000)) : null,
        avgHr: hrValues.length ? Math.round(hrValues.reduce((s, v) => s + v, 0) / hrValues.length) : null,
        isHeuristic: true
    };

}

// points: [{ time: Date, lat, lon, hr, speed (m/s del sensor o null) }],
// ya ordenados por tiempo. Devuelve { splits, speedSource } o null si no
// hay un patrón de series claro -- quien llame se queda entonces con sus
// splits de siempre (por km), sin inventar intervalos.
export function detectHeuristicIntervals(points) {

    const timed = (points || []).filter(p => toSeconds(p.time) != null);
    if (timed.length < MIN_WORK_SEC * MIN_WORK_SEGMENTS) return null;

    const source = hasGpsTrack(timed) ? "gps" : "sensor";
    const base = gridBase(timed);
    const grid = { hr: base.hr, speed: source === "sensor" ? sensorGridSpeed(timed, base) : gpsGridSpeed(timed, base) };
    const smooth = movingAverage(grid.speed, SMOOTHING_WINDOW_SEC);

    const moving = smooth.filter(v => v >= STOPPED_SPEED_MS);
    if (moving.length < MIN_WORK_SEC * MIN_WORK_SEGMENTS) return null;

    const [slow, fast] = twoLevels(moving);
    if (!(slow > 0) || fast / slow < MIN_LEVEL_RATIO) return null;

    const threshold = (slow + fast) / 2;
    const works = runsOf(smooth.map(v => v >= threshold))
        .filter(run => run.fast && run.end - run.start >= MIN_WORK_SEC);

    if (works.length < MIN_WORK_SEGMENTS) return null;

    const segments = [];

    works.forEach((work, index) => {

        if (index > 0) segments.push(buildSegment("rest", works[index - 1].end, work.start, grid));
        segments.push(buildSegment("work", work.start, work.end, grid));

    });

    return {
        speedSource: source,
        splits: segments.map((segment, index) => ({ lap: index + 1, ...segment }))
    };

}
