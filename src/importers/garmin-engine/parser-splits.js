import * as U from "./garmin-utils.js";
import * as V from "./validators.js";

// Fila de la vista estándar de Vueltas: vuelta, TIEMPO de vuelta (con
// decimales, "5:48.3"), distancia, ritmo. Sin anclar al inicio y sin
// consumir la columna del tiempo, una distancia con forma de hora
// ("5:48.3") hacía fallar el intento en la vuelta real y la búsqueda se
// deslizaba hasta encontrar un ajuste dentro del propio decimal del
// tiempo — devolviendo ese dígito como si fuera la vuelta.
const STANDARD_ROW = /^\s*([0-9]{1,2})\s+[0-9]{1,2}:[0-5][0-9](?:[.,][0-9]+)?\s+([0-9]{1,3}[,.][0-9]{1,2})\s*(?:km)?\s+([0-9]{1,2}:[0-5][0-9])(?:\s*\/\s*km)?/i;

// Fila de la vista de Vueltas desplazada a la derecha — el conjunto de
// columnas visible varía según hasta dónde se deslice la tabla (GAP
// medio a veces sí, a veces no; Ascenso/Descenso a veces sí, a veces no:
// verificado contra tres capturas reales con combinaciones distintas), así
// que no se ancla a ninguna columna concreta ni antes ni después de la FC
// — ni GAP medio, ni el número de vuelta. Ese primer número, además, viene
// corrompido con basura de scroll de forma inconsistente entre filas de la
// misma captura: a veces sin espacio ("5"+"40" residual="540"), a veces
// con uno ("7 46"), a veces con dos puntos ("8"+":11"="8:11") — y ni
// contar posiciones desde la izquierda ni desde la derecha es fiable,
// porque una columna intermedia sin valor en una fila concreta (Ascenso
// vacío, por ejemplo) desplaza el recuento de forma distinta fila a fila.
// En vez de todo eso: FC media y FC máxima son SIEMPRE columnas contiguas
// en la tabla real de Garmin, así que basta con buscar el primer par de
// TOKENS adyacentes (separados por espacio, tal cual los deja la
// tokenización por espacios en blanco) que caiga en rango real de
// pulsaciones, con la media no mayor que la máxima. Las vueltas se
// numeran por orden de aparición, nunca por ese primer dígito corrompido.
// Tokenizar por espacio (no un regex \b suelto sobre la línea entera) es
// lo que evita que un ritmo tipo "5:34" cuele su "34" como si fuera un
// número de columna real: "\b" no distingue un espacio de los dos puntos,
// así que un regex sin tokenizar antes encuentra ese "34" como candidato
// válido y, al consumirlo, ya no puede emparejar el "153"/"157" reales
// que venían justo después en la misma fila — verificado que rompía la
// extracción real con este caso exacto.
const HR_TOKEN = /^[0-9]{2,3}$/;

// Sin GAP medio de por medio (columna de ritmo, que nunca es un candidato
// válido por tener ":"), la basura de scroll pegada al número de vuelta
// puede caer justo en rango de pulsaciones (35-240) y colar un par falso
// justo antes del real -- p. ej. "38" (resto de columna) + "154" (FC media
// real) leído como par (38, 154) en vez de (154, 158). La media y la
// máxima de una misma vuelta corta (~1 km) están siempre próximas en la
// práctica (nunca se ha visto más de ~15 ppm de salto en las capturas
// reales) — un hueco así de grande (116 ppm) es fisiológicamente
// implausible para un solo tramo, así que descarta el candidato en vez de
// aceptarlo, dejando que el bucle seleccione el siguiente par real.
const MAX_LAP_HR_SPREAD_BPM = 40;

function findHrPair(line) {

    const tokens = line.trim().split(/\s+/);

    for (let i = 0; i < tokens.length - 1; i++) {

        if (!HR_TOKEN.test(tokens[i]) || !HR_TOKEN.test(tokens[i + 1])) continue;

        const avgHr = U.num(tokens[i]);
        const maxHr = U.num(tokens[i + 1]);

        if (V.heartRate(avgHr) && V.heartRate(maxHr) && avgHr <= maxHr && maxHr - avgHr <= MAX_LAP_HR_SPREAD_BPM) {
            return { avgHr, maxHr };
        }

    }

    return null;

}

function parseStandardRows(lines) {

    const laps = [];

    lines.forEach(line => {

        const match = line.match(STANDARD_ROW);
        if (!match) return;

        laps.push({
            lap: Number(match[1]),
            distance_km: U.num(match[2]),
            pace_min_km: U.pace(match[3])
        });

    });

    return laps;

}

function parseHrRows(lines) {

    const laps = [];

    lines.forEach(line => {

        const pair = findHrPair(line);
        if (!pair) return;

        laps.push({ avg_heart_rate_bpm: pair.avgHr, max_heart_rate_bpm: pair.maxHr });

    });

    // Numeradas por orden de aparición (1, 2, 3...), NUNCA por ese primer
    // dígito corrompido -- ver comentario junto a HR_TOKEN. Pero esa
    // numeración es solo relativa a ESTA captura: si el entrenamiento no
    // cupo en una sola pantalla y hay una segunda captura de esta misma
    // vista desplazada más abajo en la tabla (p. ej. vueltas 5-9 en vez de
    // 1-6), esa segunda captura también empezaría a contar desde 1 —
    // colisionando con la primera en vez de continuar donde la deja. Se
    // marca numberingIsRelative para que fusion.js sepa que este número
    // hay que realinearlo contra las vueltas ya conocidas de otras
    // capturas (por coincidencia exacta de FC en las filas solapadas)
    // antes de darlo por bueno — ver findOverlapOffset() en fusion.js.
    laps.forEach((lap, index) => { lap.lap = index + 1; lap.numberingIsRelative = true; });

    return laps;

}

export function parse(text) {
    const raw = U.cleanText(text);

    // La fila de resumen ("Total") no es una vuelta — se descarta antes
    // de intentar leerla, en vez de fiarlo a que la forma numérica falle.
    const lines = U.linesOf(raw).filter(line => !/total/i.test(U.normalize(line)));

    const standardLaps = parseStandardRows(lines);
    const laps = standardLaps.length ? standardLaps : parseHrRows(lines);

    return {
        parser: "splits-v4.3",
        fields: {
            source: U.field("Garmin", "Pantalla Vueltas", .99),
            screen_type: U.field("splits", "Vueltas", .98)
        },
        extras: { laps }
    };
}
