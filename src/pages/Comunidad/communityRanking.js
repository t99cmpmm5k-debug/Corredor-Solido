// Fase 2 de Comunidad: 4 tablas de Ranking, todas calculadas en el cliente
// a partir de la misma lista que ya trae Mapas (/api/community/entrenos) --
// ninguna llamada nueva al backend. Función pura por tabla (recibe el
// array ya devuelto por la API, no toca comunidadStore.js) para poder
// testear sin DOM, mismo criterio que communityMapData.js.
import { addDays, formatISODate } from "../../utils/date.js";

// Últimas 4 semanas desde hoy -- ventana confirmada con el usuario, la
// decide el cliente (el backend nunca filtra por fecha, ver
// server/src/routes/community.js).
const WINDOW_DAYS = 28;

// "Ritmo más rápido" ignora entrenos muy cortos (series de calentamiento,
// tramos sueltos) -- un ritmo de 500m no es comparable con uno de una
// tirada real. Umbral pedido explícitamente en la especificación.
const MIN_DISTANCE_FOR_PACE_KM = 5;

const MAX_ROWS = 5;

const LONG_TYPE = "long"; // "Tirada larga" -- ver src/data/runningWorkoutTypes.js
const Z2_TYPE = "easy"; // "Z2"/Rodaje -- mismo id que ya usa el backend (community.js)

function withinWindow(entrenos, referenceDate = new Date()) {

    const todayISO = formatISODate(referenceDate);
    const cutoffISO = addDays(todayISO, -WINDOW_DAYS);

    return entrenos.filter(e => e.date && e.date >= cutoffISO && e.date <= todayISO);

}

// Agrupa por alias (único identificador de persona que expone la API
// pública -- no hay un id de usuario real en /api/community/entrenos) y se
// queda con el MEJOR valor de cada uno según `isBetter(a, b)` (true si a
// mejora a b) -- un mismo usuario nunca ocupa dos puestos en la misma
// tabla, solo su mejor entreno cuenta.
function bestPerAlias(entrenos, pickValue, isBetter) {

    const bestByAlias = new Map();

    entrenos.forEach(entreno => {

        const value = pickValue(entreno);
        if (value == null) return;

        const current = bestByAlias.get(entreno.alias);
        if (current == null || isBetter(value, current)) {
            bestByAlias.set(entreno.alias, value);
        }

    });

    return bestByAlias;

}

function sortedRows(bestByAlias, isBetter) {

    return [...bestByAlias.entries()]
        .map(([alias, value]) => ({ alias, value }))
        .sort((a, b) => isBetter(a.value, b.value) ? -1 : 1)
        .slice(0, MAX_ROWS);

}

const lowerIsBetter = (a, b) => a < b;
const higherIsBetter = (a, b) => a > b;

// referenceDate opcional en las 4 -- mismo patrón que buildAcwrInsight()
// (utils/acwr.js): por defecto "ahora" de verdad, pero testeable con una
// fecha fija sin depender del reloj real de la máquina que ejecute los
// tests.

// 1. Ritmo más rápido -- mejor avgPaceSecPerKm (el número MÁS BAJO) entre
// entrenos con distanceKm >= 5, cualquier tipo.
export function buildFastestPaceRanking(entrenos, { referenceDate = new Date() } = {}) {

    const windowed = withinWindow(entrenos, referenceDate);

    const best = bestPerAlias(
        windowed,
        e => (e.distanceKm != null && e.distanceKm >= MIN_DISTANCE_FOR_PACE_KM && e.avgPaceSecPerKm != null) ? e.avgPaceSecPerKm : null,
        lowerIsBetter
    );

    return sortedRows(best, lowerIsBetter);

}

// 2. Z2 mejor ejecutada -- mayor z2TimeInZonePercent (campo del backend,
// aproximado desde splits, ver server/src/routes/community.js) entre
// entrenos type "easy". Un entreno "easy" sin splits/FC reales no trae ese
// campo -- pickValue lo descarta solo (nunca inventa un 0).
export function buildZ2Ranking(entrenos, { referenceDate = new Date() } = {}) {

    const windowed = withinWindow(entrenos, referenceDate);

    const best = bestPerAlias(
        windowed,
        e => (e.type === Z2_TYPE && e.z2TimeInZonePercent != null) ? e.z2TimeInZonePercent : null,
        higherIsBetter
    );

    return sortedRows(best, higherIsBetter);

}

// 3. Más constante -- usuario con más entrenos TOTALES (cualquier tipo) en
// la ventana. No es un "mejor valor de un entreno" como las otras 3 --
// cuenta cuántos hay por alias.
export function buildConsistencyRanking(entrenos, { referenceDate = new Date() } = {}) {

    const windowed = withinWindow(entrenos, referenceDate);
    const countByAlias = new Map();

    windowed.forEach(entreno => {
        countByAlias.set(entreno.alias, (countByAlias.get(entreno.alias) ?? 0) + 1);
    });

    return sortedRows(countByAlias, higherIsBetter);

}

// 4. Mejor tirada larga -- mayor distanceKm entre entrenos type "long".
export function buildLongRunRanking(entrenos, { referenceDate = new Date() } = {}) {

    const windowed = withinWindow(entrenos, referenceDate);

    const best = bestPerAlias(
        windowed,
        e => (e.type === LONG_TYPE && e.distanceKm != null) ? e.distanceKm : null,
        higherIsBetter
    );

    return sortedRows(best, higherIsBetter);

}
