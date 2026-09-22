// Fase 2 de Comunidad: tablas de Ranking, todas calculadas en el cliente a
// partir de la misma lista que ya trae Actividad (/api/community/entrenos) --
// ninguna llamada nueva al backend. Función pura por tabla (recibe el
// array ya devuelto por la API, no toca comunidadStore.js) para poder
// testear sin DOM, mismo criterio que communityFeedData.js.
//
// Pulido de cierre (punto 7): la ventana ya NO es un valor fijo de 28
// días -- acepta "week" (semana ISO actual, lunes a hoy) / "month" (mes de
// calendario actual, día 1 a hoy) / "all" (histórico completo, sin
// filtrar). El cálculo entero sigue siendo del lado del cliente sobre la
// MISMA lista ya cargada -- no hacía falta pedir nada nuevo al backend
// (éste nunca filtra por fecha, ver server/src/routes/community.js): la
// lista completa de /api/community/entrenos ya trae todo el histórico real
// de cada usuario, así que cambiar de ventana es solo re-filtrar/re-ordenar
// en memoria.
import { formatISODate, getWeekStartDate } from "../../utils/date.js";

// Cada tabla ahora devuelve el listado COMPLETO ordenado (nunca recortado
// aquí) -- el recorte a 5 puestos + el añadido de la fila propia si queda
// fuera del top 5 son decisiones de presentación de ComunidadRankingView.js,
// no de este módulo. Se sigue exportando por si algún test quiere el mismo
// límite de siempre.
export const MAX_ROWS = 5;

// "Ritmo más rápido"/"Mejor ritmo medio" ignora entrenos muy cortos (series
// de calentamiento, tramos sueltos) -- un ritmo de 500m no es comparable
// con uno de una tirada real. Umbral pedido explícitamente en la
// especificación original.
const MIN_DISTANCE_FOR_PACE_KM = 5;

const LONG_TYPE = "long"; // "Tirada larga" -- ver src/data/runningWorkoutTypes.js
const Z2_TYPE = "easy"; // "Z2"/Rodaje -- mismo id que ya usa el backend (community.js)

// null (sin rango, "all") deja pasar cualquier entreno con fecha real.
function periodRange(period, referenceDate) {

    const todayISO = formatISODate(referenceDate);

    if (period === "all") return null;

    if (period === "month") {
        return { fromISO: `${todayISO.slice(0, 7)}-01`, toISO: todayISO };
    }

    // "week" (por defecto) -- lunes de la semana ISO actual, mismo criterio
    // que ya usa Plan (getWeekStartDate, utils/date.js) para "esta semana".
    return { fromISO: getWeekStartDate(todayISO), toISO: todayISO };

}

function withinWindow(entrenos, range) {

    if (!range) return entrenos.filter(e => e.date);

    return entrenos.filter(e => e.date && e.date >= range.fromISO && e.date <= range.toISO);

}

// Exportada para que ComunidadRankingView.js pueda calcular la tarjeta
// resumen personal ("Tu semana" -- km totales/sesiones reales del propio
// usuario en la misma ventana) sin duplicar la lógica de fechas de arriba.
export function filterEntrenosByPeriod(entrenos, { referenceDate = new Date(), period = "week" } = {}) {
    return withinWindow(entrenos, periodRange(period, referenceDate));
}

// Agrupa por alias (único identificador de persona que expone la API
// pública -- no hay un id de usuario real en /api/community/entrenos) y se
// queda con el MEJOR valor de cada uno según `isBetter(a, b)` (true si a
// mejora a b) -- un mismo usuario nunca ocupa dos puestos en la misma
// tabla, solo su mejor entreno cuenta. entrenoByAlias guarda además el
// propio entreno que produjo ese valor (para el contexto "14 km · 21 sept"
// que ahora piden Mejor ritmo medio/Mejor tirada larga).
function bestPerAlias(entrenos, pickValue, isBetter) {

    const bestByAlias = new Map();
    const entrenoByAlias = new Map();

    entrenos.forEach(entreno => {

        const value = pickValue(entreno);
        if (value == null) return;

        const current = bestByAlias.get(entreno.alias);
        if (current == null || isBetter(value, current)) {
            bestByAlias.set(entreno.alias, value);
            entrenoByAlias.set(entreno.alias, entreno);
        }

    });

    return { bestByAlias, entrenoByAlias };

}

function sortedFullRows(bestByAlias, isBetter, entrenoByAlias = null) {

    return [...bestByAlias.entries()]
        .map(([alias, value]) => ({
            alias,
            value,
            ...(entrenoByAlias?.has(alias) ? { entreno: entrenoByAlias.get(alias) } : {})
        }))
        .sort((a, b) => isBetter(a.value, b.value) ? -1 : 1);

}

const lowerIsBetter = (a, b) => a < b;
const higherIsBetter = (a, b) => a > b;

// options: { referenceDate = new Date(), period = "week" } -- mismo patrón
// que buildAcwrInsight() (utils/acwr.js): por defecto "ahora"/"esta semana"
// de verdad, pero testeable con una fecha y una ventana fijas sin depender
// del reloj real de la máquina que ejecute los tests.

// 1. "Mejor ritmo medio" -- mejor avgPaceSecPerKm (el número MÁS BAJO)
// entre entrenos con distanceKm >= 5, cualquier tipo. Cada fila lleva
// también el entreno que produjo ese ritmo (distancia/fecha, contexto
// pedido en el pulido de cierre).
export function buildFastestPaceRanking(entrenos, { referenceDate = new Date(), period = "week" } = {}) {

    const windowed = withinWindow(entrenos, periodRange(period, referenceDate));

    const { bestByAlias, entrenoByAlias } = bestPerAlias(
        windowed,
        e => (e.distanceKm != null && e.distanceKm >= MIN_DISTANCE_FOR_PACE_KM && e.avgPaceSecPerKm != null) ? e.avgPaceSecPerKm : null,
        lowerIsBetter
    );

    return sortedFullRows(bestByAlias, lowerIsBetter, entrenoByAlias);

}

// 2. Z2 mejor ejecutada -- mayor z2TimeInZonePercent (campo del backend,
// aproximado desde splits, ver server/src/routes/community.js) entre
// entrenos type "easy". Un entreno "easy" sin splits/FC reales no trae ese
// campo -- pickValue lo descarta solo (nunca inventa un 0).
export function buildZ2Ranking(entrenos, { referenceDate = new Date(), period = "week" } = {}) {

    const windowed = withinWindow(entrenos, periodRange(period, referenceDate));

    const { bestByAlias } = bestPerAlias(
        windowed,
        e => (e.type === Z2_TYPE && e.z2TimeInZonePercent != null) ? e.z2TimeInZonePercent : null,
        higherIsBetter
    );

    return sortedFullRows(bestByAlias, higherIsBetter);

}

// 3. Más constante -- usuario con más entrenos TOTALES (cualquier tipo) en
// la ventana. No es un "mejor valor de un entreno" como las otras -- cuenta
// cuántos hay por alias.
export function buildConsistencyRanking(entrenos, { referenceDate = new Date(), period = "week" } = {}) {

    const windowed = withinWindow(entrenos, periodRange(period, referenceDate));
    const countByAlias = new Map();

    windowed.forEach(entreno => {
        countByAlias.set(entreno.alias, (countByAlias.get(entreno.alias) ?? 0) + 1);
    });

    return sortedFullRows(countByAlias, higherIsBetter);

}

// 4. Mejor tirada larga -- mayor distanceKm entre entrenos type "long".
// Lleva también el entreno (fecha, contexto pedido en el pulido de cierre).
export function buildLongRunRanking(entrenos, { referenceDate = new Date(), period = "week" } = {}) {

    const windowed = withinWindow(entrenos, periodRange(period, referenceDate));

    const { bestByAlias, entrenoByAlias } = bestPerAlias(
        windowed,
        e => (e.type === LONG_TYPE && e.distanceKm != null) ? e.distanceKm : null,
        higherIsBetter
    );

    return sortedFullRows(bestByAlias, higherIsBetter, entrenoByAlias);

}

// 5. "Ranking Sólido" (pulido de cierre, NUEVO) -- ranking compuesto que
// combina constancia + ejecución de Z2 + distancia de tirada larga en un
// único orden, sin mostrar la puntuación cruda al usuario (ComunidadRankingView.js
// solo pinta la posición, nunca este número intermedio).
//
// Ponderación elegida (ajustable si hace falta, ver README/memoria del
// pulido): 45% constancia, 35% Z2, 20% tirada larga. Constancia pesa más
// porque es el único de los 3 factores que TODOS los usuarios pueden
// influir con cualquier tipo de entreno (no depende de correr una tirada
// larga real esa semana, ni de que el reloj traiga FC); Z2 en segundo lugar
// porque es una medida real de EJECUCIÓN (no solo de volumen); tirada larga con el
// peso más bajo porque es el factor más "de nicho" -- muchos usuarios
// pueden no tener ninguna esa semana sin que eso signifique que entrenan
// peor. Cada factor se normaliza 0-1 dividiendo por el máximo real
// alcanzado por CUALQUIER usuario en la misma ventana (no por un techo fijo
// inventado) -- así la fórmula se adapta sola a lo que de verdad está
// pasando esa semana/mes en la comunidad, en vez de penalizar a todo el
// mundo si nadie corrió una tirada muy larga. Un usuario sin ningún dato en
// los 3 factores (constancia=0 es imposible si aparece en la lista, pero
// Z2/tirada larga si pueden faltar del todo) simplemente puntúa 0 en esa
// parte -- nunca se inventa un valor.
const SOLID_RANKING_WEIGHTS = { consistency: 0.45, z2: 0.35, longRun: 0.20 };

export function buildSolidRanking(entrenos, { referenceDate = new Date(), period = "week" } = {}) {

    const consistency = buildConsistencyRanking(entrenos, { referenceDate, period });
    const z2 = buildZ2Ranking(entrenos, { referenceDate, period });
    const longRun = buildLongRunRanking(entrenos, { referenceDate, period });

    const maxConsistency = Math.max(0, ...consistency.map(r => r.value));
    const maxZ2 = Math.max(0, ...z2.map(r => r.value));
    const maxLongRun = Math.max(0, ...longRun.map(r => r.value));

    const consistencyByAlias = new Map(consistency.map(r => [r.alias, r.value]));
    const z2ByAlias = new Map(z2.map(r => [r.alias, r.value]));
    const longRunByAlias = new Map(longRun.map(r => [r.alias, r.value]));

    // Solo entran en el compuesto los alias que aparecen en AL MENOS uno de
    // los 3 factores -- alguien sin ningún entreno en la ventana no debe
    // aparecer con un 0 artificial (eso lo hundiría al fondo de una tabla en
    // la que ni siquiera participó de verdad esta ventana).
    const allAliases = new Set([...consistencyByAlias.keys(), ...z2ByAlias.keys(), ...longRunByAlias.keys()]);

    const scored = [...allAliases].map(alias => {

        const consistencyScore = maxConsistency > 0 ? (consistencyByAlias.get(alias) ?? 0) / maxConsistency : 0;
        const z2Score = maxZ2 > 0 ? (z2ByAlias.get(alias) ?? 0) / maxZ2 : 0;
        const longRunScore = maxLongRun > 0 ? (longRunByAlias.get(alias) ?? 0) / maxLongRun : 0;

        const score =
            consistencyScore * SOLID_RANKING_WEIGHTS.consistency +
            z2Score * SOLID_RANKING_WEIGHTS.z2 +
            longRunScore * SOLID_RANKING_WEIGHTS.longRun;

        return { alias, value: score };

    });

    return sortedFullRows(new Map(scored.map(r => [r.alias, r.value])), higherIsBetter);

}
