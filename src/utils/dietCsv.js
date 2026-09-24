// Parser de la plantilla CSV de dieta (Nutrición, Gimnasio) -- formato
// FIJO, pensado para rellenarse siempre igual (a mano o por un
// nutricionista), para que importar sea 100 % fiable sin IA ni
// heurísticas:
//
//   dia,momento,opcion,alimento,notas
//
// - dia: LUNES..VIERNES, TIRADA_LARGA, DESCANSO (los dos menús de fin de
//   semana; cada semana se elige en la app qué día real es cuál) o
//   REGLAS_GENERALES (notas no ligadas a ningún día).
// - momento: texto libre (hora, "Post-gym"...), o una palabra reservada:
//   HIDRATACION (cantidad de agua, en "alimento"), AJUSTE (nota del día, en
//   "notas") y REGLA (solo en REGLAS_GENERALES, en "notas").
// - opcion: entero >= 1; mismo dia+momento con varios números = opciones
//   alternativas para esa comida.
//
// Una fila que no encaja NUNCA se corrige ni se interpreta: se rechaza el
// archivo entero con la lista de errores (línea y motivo), y no se
// importa nada. Referencia real: dieta_2500_plantilla.csv (2026-09-24).

export const HEADER = ["dia", "momento", "opcion", "alimento", "notas"];

export const WEEK_DAYS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"];
export const WEEKEND_DAYS = ["TIRADA_LARGA", "DESCANSO"];
export const PLAN_DAYS = [...WEEK_DAYS, ...WEEKEND_DAYS];
export const GENERAL_RULES = "REGLAS_GENERALES";

const RESERVED_MOMENTS = ["HIDRATACION", "AJUSTE", "REGLA"];

const MAX_ERRORS = 25;
const MAX_BYTES = 1024 * 1024;

// CSV estándar (RFC 4180): comillas dobles para campos con separador,
// comillas o saltos de línea, "" como comilla escapada. Devuelve cada
// registro con la línea física donde empieza, para los mensajes de error.
export function parseCsvRecords(text, delimiter) {

    const records = [];
    let field = "", fields = [], line = 1, recordLine = 1, inQuotes = false, fieldStarted = false;

    for (let i = 0; i < text.length; i++) {

        const ch = text[i];

        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else {
                if (ch === "\n") line++;
                field += ch;
            }
            continue;
        }

        if (ch === '"' && !fieldStarted) { inQuotes = true; fieldStarted = true; continue; }

        if (ch === delimiter) { fields.push(field); field = ""; fieldStarted = false; continue; }

        if (ch === "\r") continue;

        if (ch === "\n") {
            fields.push(field);
            records.push({ line: recordLine, fields });
            field = ""; fields = []; fieldStarted = false;
            line++; recordLine = line;
            continue;
        }

        field += ch;
        fieldStarted = true;

    }

    if (inQuotes) return { records, unterminatedQuoteLine: recordLine };

    if (field !== "" || fields.length) {
        fields.push(field);
        records.push({ line: recordLine, fields });
    }

    return { records };

}

// El separador sale de la cabecera, no se adivina: "," (el de la
// plantilla) o ";" (el que usa Excel en español al guardar como CSV).
function detectDelimiter(firstLine) {

    const clean = firstLine.trim().toLowerCase();
    if (clean === HEADER.join(",")) return ",";
    if (clean === HEADER.join(";")) return ";";
    return null;

}

function describeValues(values) {

    return values.join(", ");

}

// texto del CSV -> { plan } | { errors: [{ line, message }] }. `plan`:
// { days: { LUNES: { hydration, adjustment, meals: [{ key, moment,
// options: [{ key, number, text }] }] }, ... }, generalRules: [{ number,
// text }] }. Las claves son deterministas (dia|momento|opcion): reimportar
// el mismo CSV corregido conserva lo ya marcado.
export function parseDietCsv(rawText) {

    const errors = [];
    const fail = (line, message) => { if (errors.length < MAX_ERRORS) errors.push({ line, message }); };

    if (typeof rawText !== "string" || !rawText.trim()) return { errors: [{ line: null, message: "El archivo está vacío." }] };
    if (rawText.length > MAX_BYTES) return { errors: [{ line: null, message: "El archivo es demasiado grande para ser una dieta (máximo 1 MB)." }] };

    const text = rawText.replace(/^\uFEFF/, "");
    const firstLine = text.split(/\r?\n/, 1)[0];
    const delimiter = detectDelimiter(firstLine);

    if (!delimiter) {
        return { errors: [{ line: 1, message: `La primera fila tiene que ser exactamente «${HEADER.join(",")}» (en este orden). Se ha encontrado «${firstLine.trim()}».` }] };
    }

    const { records, unterminatedQuoteLine } = parseCsvRecords(text, delimiter);

    if (unterminatedQuoteLine) {
        return { errors: [{ line: unterminatedQuoteLine, message: "Hay unas comillas (\") que se abren y no se cierran." }] };
    }

    const days = Object.fromEntries(PLAN_DAYS.map(day => [day, { hydration: null, adjustment: null, meals: [] }]));
    const generalRules = [];
    const seen = new Map();

    for (const { line, fields } of records.slice(1)) {

        // Filas totalmente vacías (p. ej. el salto de línea final, o una
        // fila ",,,," que deja Excel): no son datos, se ignoran.
        if (fields.every(f => f.trim() === "")) continue;

        if (fields.length !== HEADER.length) {
            fail(line, `tiene ${fields.length} columnas y se esperan ${HEADER.length} (${HEADER.join(", ")}). Si un texto lleva "${delimiter}", ponlo entre comillas.`);
            continue;
        }

        const [dia, momento, opcionRaw, alimento, notas] = fields.map(f => f.trim());

        if (!PLAN_DAYS.includes(dia) && dia !== GENERAL_RULES) {
            fail(line, `el día «${dia}» no es válido. Tiene que ser uno de: ${describeValues([...PLAN_DAYS, GENERAL_RULES])} (en mayúsculas y sin tildes).`);
            continue;
        }

        if (!momento) {
            fail(line, "falta el momento (una hora, un nombre como «Post-gym», o HIDRATACION/AJUSTE/REGLA).");
            continue;
        }

        // "Ajuste", "hidratación"... escrito distinto de la palabra
        // reservada: casi seguro un error, pero no se corrige solo.
        const reservedLike = RESERVED_MOMENTS.find(r => r !== momento && r === momento.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
        if (reservedLike) {
            fail(line, `el momento «${momento}» se parece a la palabra especial ${reservedLike}, pero tiene que escribirse exactamente «${reservedLike}».`);
            continue;
        }

        if (!/^[1-9]\d*$/.test(opcionRaw)) {
            fail(line, `la opción «${opcionRaw}» no es válida: tiene que ser un número entero (1, 2, 3…).`);
            continue;
        }

        const opcion = Number(opcionRaw);

        const key = `${dia}|${momento}|${opcion}`;
        if (seen.has(key)) {
            fail(line, `repite ${dia} · ${momento} · opción ${opcion}, que ya está en la línea ${seen.get(key)}.`);
            continue;
        }
        seen.set(key, line);

        if (dia === GENERAL_RULES) {

            if (momento !== "REGLA") { fail(line, `en REGLAS_GENERALES el momento tiene que ser REGLA (se ha encontrado «${momento}»).`); continue; }
            if (alimento) { fail(line, "una REGLA no lleva nada en «alimento»: el texto va en «notas»."); continue; }
            if (!notas) { fail(line, "a esta REGLA le falta el texto en «notas»."); continue; }

            generalRules.push({ number: opcion, text: notas });
            continue;

        }

        const day = days[dia];

        if (momento === "REGLA") { fail(line, "REGLA solo se usa con el día REGLAS_GENERALES."); continue; }

        if (momento === "HIDRATACION") {

            if (!alimento) { fail(line, "a HIDRATACION le falta la cantidad de agua en «alimento» (p. ej. «3.0 L aprox.»)."); continue; }
            if (notas) { fail(line, "HIDRATACION no lleva «notas»: la cantidad va en «alimento»."); continue; }
            if (day.hydration) { fail(line, `${dia} ya tiene una fila HIDRATACION.`); continue; }

            day.hydration = alimento;
            continue;

        }

        if (momento === "AJUSTE") {

            if (alimento) { fail(line, "AJUSTE no lleva nada en «alimento»: el texto va en «notas»."); continue; }
            if (!notas) { fail(line, "a este AJUSTE le falta el texto en «notas»."); continue; }
            if (day.adjustment) { fail(line, `${dia} ya tiene una fila AJUSTE.`); continue; }

            day.adjustment = notas;
            continue;

        }

        if (!alimento) { fail(line, `a ${dia} · ${momento} · opción ${opcion} le falta el texto en «alimento».`); continue; }
        if (notas) { fail(line, "las comidas no llevan «notas» (solo AJUSTE y REGLA). Si es parte de la comida, ponlo en «alimento»."); continue; }

        let meal = day.meals.find(m => m.moment === momento);
        if (!meal) {
            meal = { key: `${dia}|${momento}`, moment: momento, options: [] };
            day.meals.push(meal);
        }

        meal.options.push({ key, number: opcion, text: alimento });

    }

    if (!errors.length) {
        for (const dia of PLAN_DAYS) {
            if (!days[dia].meals.length) fail(null, `falta ${dia}: la dieta necesita al menos una comida para cada uno de ${describeValues(PLAN_DAYS)}.`);
        }
    }

    if (errors.length) return { errors };

    for (const day of Object.values(days)) {
        for (const meal of day.meals) meal.options.sort((a, b) => a.number - b.number);
    }
    generalRules.sort((a, b) => a.number - b.number);

    return { plan: { days, generalRules } };

}

// Plantilla vacía para descargar desde la app: la cabecera y una fila de
// ejemplo de cada tipo, para rellenarla siguiendo el mismo formato.
export function buildDietCsvTemplate() {

    return [
        HEADER.join(","),
        "LUNES,HIDRATACION,1,3.0 L aprox.,",
        "LUNES,09:00,1,2 huevos + avena 35 g,",
        "LUNES,21:00,1,Merluza 180 g + verdura 250 g,",
        "LUNES,21:00,2,Pollo 160 g + verdura 250 g,",
        "LUNES,AJUSTE,1,,Nota del día.",
        "REGLAS_GENERALES,REGLA,1,,Regla general de la dieta."
    ].join("\n") + "\n";

}
