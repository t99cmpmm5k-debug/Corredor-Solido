import { normalizeText, slugify } from "./text.js";

const WEEKDAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

const LABEL_ROW = ["ejercicio", "series", "reps", "peso"];

// Vocabulario cerrado de valores cualitativos de Peso ya vistos SIN fundir
// en el documento real — se usa solo para reconocer el sufijo cuando Reps
// y Peso llegan fundidos en un único token (ver splitMergedRepsPeso). No es
// una lista exhaustiva de todo lo que "Peso" puede contener en general
// (una fila de 4 tokens acepta cualquier texto ahí, fundida o no).
const QUALITATIVE_SUFFIX_RE = /^(.+?)\s+(Asistencia|Moderado|Pesado|Banda|Peso corporal)$/i;
const KG_SUFFIX_RE = /^(.+?)\s+(\d+(?:[.,]\d+)?\s*kg(?:\/mano)?)$/i;
const RIR_SUFFIX_RE = /^(.+?)\s+(RIR\s*\d+(?:-\d+)?)$/i;

const PESO_KG_RE = /^(\d+(?:[.,]\d+)?)(?:-\d+(?:[.,]\d+)?)?\s*kg(\/mano)?$/i;

function isDayHeaderRow(row) {

    if (row.length !== 1) return null;

    const match = row[0].match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\s*-\s*(.+)$/);
    if (!match) return null;

    const weekday = normalizeText(match[1]);
    if (!WEEKDAYS.includes(weekday)) return null;

    return { weekday, title: match[2].trim() };

}

function isLabelRow(row) {

    return row.length === 4 && row.every((token, i) => normalizeText(token) === LABEL_ROW[i]);

}

// Reps y Peso llegaron fundidos en un único ítem de PDF (ver pdfText.js) —
// no hay coordenada intermedia con la que separarlos por posición, así que
// se recorta por el sufijo de Peso reconocible. Si nada matchea, se recorta
// por el último espacio como último recurso. En los dos casos se marca
// `guessed:true` para que el llamador añada un aviso de importación — el
// heurístico puede acertar el corte, pero siempre debe revisarse a mano.
function splitMergedRepsPeso(token) {

    for (const re of [KG_SUFFIX_RE, RIR_SUFFIX_RE, QUALITATIVE_SUFFIX_RE]) {

        const match = token.match(re);
        if (match) return { reps: match[1].trim(), peso: match[2].trim(), guessed: true };

    }

    const lastSpace = token.lastIndexOf(" ");
    if (lastSpace === -1) return { reps: token, peso: null, guessed: true };

    return { reps: token.slice(0, lastSpace).trim(), peso: token.slice(lastSpace + 1).trim(), guessed: true };

}

function parsePeso(text) {

    if (text == null || text.trim() === "" || text.trim() === "-") {
        return { targetWeight: null, weightUnit: null, targetLoadText: null };
    }

    const trimmed = text.trim();
    const kgMatch = trimmed.match(PESO_KG_RE);

    if (kgMatch) {
        return {
            targetWeight: Number(kgMatch[1].replace(",", ".")),
            weightUnit: kgMatch[2] ? "kg/mano" : "kg",
            targetLoadText: trimmed
        };
    }

    return { targetWeight: null, weightUnit: null, targetLoadText: trimmed };

}

function buildFieldMeta(repsConfidence, pesoConfidence) {

    return {
        name: { confidence: 1, corrected: false },
        sets: { confidence: 1, corrected: false },
        targetReps: { confidence: repsConfidence, corrected: false },
        targetLoadText: { confidence: pesoConfidence, corrected: false }
    };

}

// row ya tiene 3 o 4 tokens (ver parseGymRoutineFromRows) — null si `series`
// no es un entero, la única forma en la que una fila con la forma correcta
// puede no ser de verdad un ejercicio.
function parseExerciseRow(row, usedIds) {

    const [nameToken, seriesToken, ...rest] = row;

    if (!/^\d+$/.test(seriesToken)) return null;

    const sets = Number(seriesToken);
    const importWarnings = [];

    let repsToken;
    let pesoToken;

    if (rest.length === 2) {

        [repsToken, pesoToken] = rest;

    } else {

        const split = splitMergedRepsPeso(rest[0]);
        repsToken = split.reps;
        pesoToken = split.peso;

        importWarnings.push(
            `Reps y Peso llegaron fundidos en el PDF ("${rest[0]}") — se separaron de forma automática, revisa que "${repsToken}" / "${pesoToken ?? "—"}" sean correctos.`
        );

    }

    const peso = parsePeso(pesoToken);

    const baseId = slugify(nameToken);
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
    }
    usedIds.add(id);

    return {
        id,
        name: nameToken.trim(),
        sets,
        targetReps: repsToken.trim(),
        targetWeight: peso.targetWeight,
        weightUnit: peso.weightUnit,
        targetLoadText: peso.targetLoadText,
        fieldMeta: buildFieldMeta(
            rest.length === 2 ? 1 : 0.6,
            rest.length === 2 ? 1 : 0.6
        ),
        importWarnings
    };

}

export function parseGymRoutineFromRows(rows) {

    if (rows.length === 0) {
        throw new Error("El PDF no contiene texto legible.");
    }

    const headerIndexes = [];
    rows.forEach((row, index) => {
        if (isDayHeaderRow(row)) headerIndexes.push(index);
    });

    if (headerIndexes.length === 0) {
        throw new Error("No se han reconocido días en este PDF — puede que el formato no coincida con lo esperado.");
    }

    const routineName = headerIndexes[0] > 0 ? rows.slice(0, headerIndexes[0]).map(r => r.join(" ")).join(" ") : null;

    const routineWarnings = [];
    let routineNotes = null;
    const usedIds = new Set();
    const usedDayIds = new Set();

    const days = headerIndexes.map((headerIndex, i) => {

        const { weekday, title } = isDayHeaderRow(rows[headerIndex]);
        const regionEnd = i + 1 < headerIndexes.length ? headerIndexes[i + 1] : rows.length;
        const regionRows = rows.slice(headerIndex + 1, regionEnd);

        const bodyRows = isLabelRow(regionRows[0]) ? regionRows.slice(1) : regionRows;
        if (regionRows.length && !isLabelRow(regionRows[0])) {
            routineWarnings.push(`No se reconoció la fila de encabezado de la tabla en "${title}" — revisa que las columnas sean Ejercicio/Series/Reps/Peso.`);
        }

        const exercises = [];
        let trailingStart = bodyRows.length;

        for (let r = 0; r < bodyRows.length; r++) {

            const row = bodyRows[r];

            if (row.length !== 3 && row.length !== 4) {
                trailingStart = r;
                break;
            }

            const exercise = parseExerciseRow(row, usedIds);

            if (!exercise) {
                routineWarnings.push(`Fila no reconocida en "${title}": "${row.join(" ")}".`);
                continue;
            }

            exercises.push(exercise);

        }

        const trailingRows = bodyRows.slice(trailingStart);
        if (trailingRows.length) {

            const text = trailingRows.map(r => r.join(" ")).join(" ").trim();

            // Solo se ha visto este patrón detrás del último día — si
            // aparece entre dos días, sigue siendo texto legítimo de nota
            // general (no pertenece a ningún ejercicio), así que se
            // acumula igual en vez de descartarlo.
            routineNotes = routineNotes ? `${routineNotes} ${text}` : text;

        }

        const baseDayId = slugify(`${weekday}-${title}`);
        let dayId = baseDayId;
        let suffix = 2;
        while (usedDayIds.has(dayId)) {
            dayId = `${baseDayId}-${suffix}`;
            suffix += 1;
        }
        usedDayIds.add(dayId);

        return { id: dayId, title, weekday, exercises };

    });

    return { routineName, days, routineNotes, routineWarnings };

}
