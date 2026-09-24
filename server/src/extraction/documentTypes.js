// Tipos de documento que sabe extraer POST /api/extract-document (ver
// routes/extract.js). Cada tipo aporta solo su parte: el esquema JSON de
// `data` y unas instrucciones propias. El envoltorio común (avisos de lo
// que no se pudo extraer con confianza, documento que no es del tipo
// pedido) lo pone buildOutputSchema() igual para todos, para que ningún
// importador pueda olvidarse de él.
//
// Añadir un tipo = una entrada aquí. Cada esquema se diseña contra un
// documento REAL de ese tipo, nunca contra una estructura supuesta.
export const DOCUMENT_TYPES = {};

const NOTE_SCHEMA = {
    type: "object",
    properties: {
        label: { type: ["string", "null"] },
        text: { type: "string" }
    },
    required: ["label", "text"],
    additionalProperties: false
};

// Dieta: diseñado contra la dieta real de Rafa (Dieta_2500_Rafa_adaptada_
// running.pdf, 2026-09-24): 7 días distintos (lunes-domingo) con subtítulo
// ("Gym torso"); comidas rotuladas por HORA o momento ("09:00",
// "Post-gym", "Pre-run"), no desayuno/comida/cena; alternativas dentro de
// una comida ("Alternativa:", "Elegir 1: a / b / c", "Opción A/B");
// condiciones ("Si corres por la mañana: …", "Si hay tirada", "Si
// descansas"); remisiones a otro día ("usa exactamente el esquema del
// sábado"); y filas que no son comida (Hidratación, Ajuste, reglas).
DOCUMENT_TYPES.dieta = {
    label: "a diet plan (dieta)",
    instructions: `Document kind: a diet plan written by a nutritionist or a template.

- \`structure\`: "weekly" when the document gives different content for named days of the week; "single_day" when one plan applies to every day (then \`days\` has exactly one entry with \`weekday\` null). Decide this from the document itself.
- One \`days\` entry per day section, in document order. \`weekday\` only when the document names the day (lowercase Spanish: lunes, martes, miercoles, jueves, viernes, sabado, domingo, without accents); \`label\` is the day heading as written; \`subtitle\` is any text next to it (e.g. the training of the day), else null.
- \`meals\`: one per food row, in order. \`label\` is the row label exactly as written (a time like "09:00" or a name like "Post-gym"); never rename it to breakfast/lunch/dinner or any category. If the row label says the meal only applies in some case (e.g. "Si hay tirada - Pre", "Si descansas - 09:00"), copy that case into \`condition\` ("Si hay tirada", "Si descansas") and the rest into \`label\` ("Pre", "09:00").
- \`options\`: the ways to eat that meal. A plain list is one option with \`label\` null. Text introducing alternatives ("Alternativa:", "Elegir 1:" with "/" separators, "Opción A:", "Opción B:") produces one option per alternative, with \`label\` as written ("Alternativa", "Opción A"; for "Elegir 1" use "Elegir 1 · 1", "Elegir 1 · 2"...). When the cell makes the food depend on a situation ("Si corres por la mañana: …. Si corres por la tarde: …"), make one option per situation with that situation in \`condition\`.
- \`items\`: split each option's foods on the document's own separators ("+"), one item per food, \`text\` verbatim with its quantity and unit ("avena 35 g", "2 huevos", "nueces 10-15 g"). Advice or explanations inside a cell that are not a food ("si corres al levantarte", "mantén comidas previas normales") go in the option's \`note\`, verbatim, not in \`items\`.
- Rows that are not food (hydration, adjustments, remarks) go to that day's \`notes\` with their row label. If a row sends the reader to another day ("usa exactamente el esquema del sábado"), put it in \`notes\` verbatim and do NOT copy the other day's meals here.
- Text that belongs to the whole document (title, objective, general hydration advice, general rules) goes to \`generalNotes\`; the main title goes to \`title\`.`,
    schema: {
        type: "object",
        properties: {
            title: { type: ["string", "null"] },
            structure: { type: "string", enum: ["weekly", "single_day"] },
            generalNotes: { type: "array", items: NOTE_SCHEMA },
            days: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        weekday: { anyOf: [{ type: "string", enum: ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"] }, { type: "null" }] },
                        label: { type: "string" },
                        subtitle: { type: ["string", "null"] },
                        notes: { type: "array", items: NOTE_SCHEMA },
                        meals: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    label: { type: "string" },
                                    condition: { type: ["string", "null"] },
                                    options: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                label: { type: ["string", "null"] },
                                                condition: { type: ["string", "null"] },
                                                note: { type: ["string", "null"] },
                                                items: {
                                                    type: "array",
                                                    items: {
                                                        type: "object",
                                                        properties: { text: { type: "string" } },
                                                        required: ["text"],
                                                        additionalProperties: false
                                                    }
                                                }
                                            },
                                            required: ["label", "condition", "note", "items"],
                                            additionalProperties: false
                                        }
                                    }
                                },
                                required: ["label", "condition", "options"],
                                additionalProperties: false
                            }
                        }
                    },
                    required: ["weekday", "label", "subtitle", "notes", "meals"],
                    additionalProperties: false
                }
            }
        },
        required: ["title", "structure", "generalNotes", "days"],
        additionalProperties: false
    }
};

// Estructured outputs de la API de Claude: todo objeto necesita
// additionalProperties:false y todas sus propiedades en required (lo
// opcional se expresa como null, no como ausente).
const UNCERTAIN_ENTRY_SCHEMA = {
    type: "object",
    properties: {
        // Dónde está en el documento, con sus propias palabras (página,
        // día, comida, sección...) -- para que el usuario lo encuentre.
        location: { type: "string" },
        // El texto tal cual se lee, o null si ni eso es legible.
        rawText: { type: ["string", "null"] },
        // Por qué no se extrajo o se extrajo con dudas, en español.
        reason: { type: "string" }
    },
    required: ["location", "rawText", "reason"],
    additionalProperties: false
};

export function buildOutputSchema(dataSchema) {

    return {
        type: "object",
        properties: {
            documentMatchesType: { type: "boolean" },
            data: dataSchema,
            uncertain: { type: "array", items: UNCERTAIN_ENTRY_SCHEMA }
        },
        required: ["documentMatchesType", "data", "uncertain"],
        additionalProperties: false
    };

}

// Reglas comunes a cualquier tipo: transcribir, no interpretar. Lo dudoso
// va a `uncertain` para que el usuario lo revise a mano -- nunca se
// completa un hueco con una suposición.
export const COMMON_SYSTEM_PROMPT = `You turn a document a user uploaded into JSON that matches the provided schema. This is transcription, not interpretation: the user will act on this data (what they eat, how they train), so a confident-looking guess is worse than a visible gap.

- Copy text exactly as it appears in the document: same language, wording, quantities and units. Do not translate, normalize, round, convert units, compute totals or nutritional values, or add anything that is not written.
- When part of the document is illegible, ambiguous, or does not fit the schema, do not guess and do not fill the gap. Leave it out of \`data\` and add an entry to \`uncertain\` with: \`location\` (where it is, using the document's own labels: page, day, meal, section), \`rawText\` (the text you can read there, or null), and \`reason\` (a short explanation in Spanish).
- When you include an item but one of its details is doubtful (a quantity you can't read well, a line that could belong to two meals), keep the item and also add an \`uncertain\` entry pointing at it.
- If the document is not the kind of document requested, set \`documentMatchesType\` to false, return the smallest valid \`data\`, and explain in one \`uncertain\` entry what the document seems to be instead.
- Every \`uncertain\` entry will be shown to the user to review by hand, so be specific about where to look.`;
