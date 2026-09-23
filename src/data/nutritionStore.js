// Nutrición (Gimnasio): un registro por alimento añadido a un día -- no un
// documento por día --, para que dos dispositivos que añaden cosas al mismo
// día no se pisen en el sync (last-write-wins por registro, ver
// server/src/routes/sync.js). Cada registro guarda la copia de los valores
// por 100 g/ml que dio Open Food Facts al añadirlo, así el histórico no
// cambia si el producto se corrige allí después. Un valor que el producto
// no traía se queda null (nunca 0 ni estimado) y el total del día lo avisa.
// En el sync con el backend y el backup JSON desde el primer día, mismo
// patrón que bodyCompositionStore.js.
import { STORES, getAll, put, remove } from "./db.js";
import { generateId } from "../utils/id.js";
import { notifyDataChanged } from "./changeEvents.js";
import { recordTombstone } from "./tombstoneStore.js";
import { macrosForAmount } from "../services/openFoodFacts.js";

export const MEALS = [
    { id: "desayuno", label: "Desayuno" },
    { id: "comida", label: "Comida" },
    { id: "cena", label: "Cena" },
    { id: "snack", label: "Snack" }
];

export const MACRO_KEYS = ["kcal", "protein", "carbs", "fat"];

const entries = [];

let hydrated = null;

export function hydrate() {

    if (hydrated) return hydrated;

    hydrated = getAll(STORES.nutritionEntries).then(loaded => {

        entries.push(...loaded);

    }).catch(err => {

        console.warn("No se pudo cargar el registro de nutrición — la app sigue sin persistencia.", err);

    });

    return hydrated;

}

// Todos, más reciente primero (sync/backup/resumen de Perfil).
export function getNutritionEntries() {

    return [...entries].sort((a, b) =>
        b.date.localeCompare(a.date) || (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
    );

}

// Los de un día, en el orden en que se añadieron.
export function getNutritionEntriesForDate(date) {

    return entries
        .filter(e => e.date === date)
        .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

}

function upsertInto(entry) {

    const index = entries.findIndex(e => e.id === entry.id);
    if (index === -1) entries.push(entry);
    else entries[index] = entry;

    return put(STORES.nutritionEntries, entry).catch(() => {});

}

// product: el normalizado de openFoodFacts.js (code/name/brand/unit/per100).
// grams: cantidad ya en g/ml (una ración se convierte antes con sus gramos).
export function addNutritionEntry({ date, meal, product, grams, servings = null }) {

    const now = new Date().toISOString();

    const entry = {
        id: generateId(),
        date,
        meal,
        productCode: product.code || null,
        name: product.name,
        brand: product.brand ?? null,
        unit: product.unit,
        grams,
        // Si se añadió por raciones, cuántas y de qué tamaño -- solo para
        // mostrarlo igual que se tecleó ("2 × 125 g").
        servings: servings == null ? null : { count: servings, grams: product.serving.grams, label: product.serving.label },
        per100: { ...product.per100 },
        ...macrosForAmount(product.per100, grams),
        createdAt: now,
        updatedAt: now
    };

    upsertInto(entry);
    notifyDataChanged();

    return entry;

}

export function deleteNutritionEntry(id) {

    const index = entries.findIndex(e => e.id === id);
    if (index === -1) return;

    entries.splice(index, 1);

    remove(STORES.nutritionEntries, id).catch(() => {});
    recordTombstone("nutritionEntries", id);
    notifyDataChanged();

}

// Restauración desde el sync o un backup (conserva el id original, sin
// notificar: no es un cambio del usuario).
export function restoreNutritionEntry(entry) {

    return upsertInto(entry);

}

// Totales de una lista de registros. `missing[key]` cuenta cuántos no
// traían ese valor -- el total es entonces "al menos", y la pantalla lo
// dice en vez de presentarlo como completo.
export function sumNutrition(list) {

    const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const missing = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

    for (const entry of list) {
        for (const key of MACRO_KEYS) {
            if (entry[key] == null) missing[key]++;
            else totals[key] += entry[key];
        }
    }

    totals.kcal = Math.round(totals.kcal);
    for (const key of ["protein", "carbs", "fat"]) totals[key] = Math.round(totals[key] * 10) / 10;

    return { totals, missing };

}

// Cantidad tecleada -> gramos (o ml), o { error }. Admite coma decimal. Por
// raciones, multiplica por los gramos de la ración que declara el producto.
export function parseAmount(raw, { mode, product }) {

    const text = String(raw ?? "").trim().replace(",", ".");
    if (!text) return { error: "Indica la cantidad." };

    const n = Number(text);
    if (!Number.isFinite(n) || n <= 0) return { error: "Revisa la cantidad: tiene que ser un número mayor que 0." };

    if (mode === "serving") {
        if (!product.serving) return { error: "Este producto no indica el tamaño de su ración — añádelo en gramos." };
        if (n > 50) return { error: "Revisa la cantidad: como mucho 50 raciones." };
        return { grams: Math.round(n * product.serving.grams * 10) / 10, servings: n };
    }

    if (n > 5000) return { error: `Revisa la cantidad: como mucho 5000 ${product.unit}.` };

    return { grams: Math.round(n * 10) / 10, servings: null };

}

// Comida por defecto según la hora -- solo preselecciona el selector.
export function defaultMealForHour(hour) {

    if (hour < 11) return "desayuno";
    if (hour < 17) return "comida";
    if (hour < 20) return "snack";
    return "cena";

}
