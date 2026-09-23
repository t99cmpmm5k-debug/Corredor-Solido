// Búsqueda de alimentos en Open Food Facts (Nutrición, Gimnasio) -- API
// pública, sin key, consultada directamente desde el navegador.
//
// Endpoint elegido tras probarlo de verdad (2026-09-24), no por la
// documentación: search.openfoodfacts.org (el buscador nuevo) NO manda
// Access-Control-Allow-Origin y el navegador bloquea la respuesta; el
// clásico /cgi/search.pl SÍ la manda. Se usa el subdominio "es." porque ahí
// search.pl se limita a productos vendidos en España (mucho mejor
// "plátano" o "pechuga de pollo" que el mundial), ordenado por popularidad.
//
// search.pl devuelve a ratos 503 ("unusually high demand") -- la mitad de
// las peticiones en las pruebas del 2026-09-24, al azar, sin relación con
// la consulta ni los parámetros --, y esa página de error viene sin
// cabecera CORS, así que el navegador la ve como un fallo de red. Por eso
// dos reintentos automáticos con pausa creciente antes de dar el aviso, y
// el botón "Reintentar" en la pantalla si aun así falla.
const SEARCH_URL = "https://es.openfoodfacts.org/cgi/search.pl";

const PAGE_SIZE = 20;
const RETRY_DELAYS_MS = [1000, 2000];

const FIELDS = [
    "code", "product_name", "product_name_es", "brands", "nutriments",
    "serving_size", "serving_quantity", "serving_quantity_unit", "quantity"
].join(",");

// Resultados por consulta ya hecha -- volver a una búsqueda anterior (borrar
// una letra, reabrir la pestaña) no gasta otra petición: el límite de OFF
// para búsquedas es de 10 por minuto.
const cache = new Map();

function normalizeQuery(query) {

    return String(query ?? "").trim().toLowerCase().replace(/\s+/g, " ");

}

// Valor por 100 g/ml de OFF -> número, o null si no viene o es imposible
// (negativo, más de 100 g de un macro en 100 g, más de 900 kcal -- ni la
// grasa pura llega). Un dato imposible no se corrige ni se estima: se trata
// como no disponible.
function nutrientValue(nutriments, key, max) {

    const raw = nutriments?.[key];
    if (raw == null || raw === "") return null;

    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= max ? n : null;

}

// "250 ml", "1 l", "cl" -> líquido (los valores de OFF para bebidas son por
// 100 ml aunque la clave diga _100g).
function isLiquid(product) {

    const unit = String(product.serving_quantity_unit ?? "").toLowerCase();
    if (unit === "ml") return true;

    return /\d\s*(ml|cl|l)\b/i.test(String(product.quantity ?? ""));

}

// Producto crudo de OFF -> el mínimo que usa la app, o null si no sirve
// (sin nombre, o sin ninguno de los 4 valores). Los valores que falten se
// quedan en null -- nunca 0 ni sacados de otra fuente.
export function normalizeProduct(product) {

    const name = String(product?.product_name_es || product?.product_name || "").trim();
    if (!name) return null;

    const n = product.nutriments;

    const per100 = {
        kcal: nutrientValue(n, "energy-kcal_100g", 900),
        protein: nutrientValue(n, "proteins_100g", 100),
        carbs: nutrientValue(n, "carbohydrates_100g", 100),
        fat: nutrientValue(n, "fat_100g", 100)
    };

    if (Object.values(per100).every(v => v == null)) return null;

    const servingQuantity = Number(product.serving_quantity);
    const servingUnit = String(product.serving_quantity_unit ?? "g").toLowerCase();
    const hasServing = Number.isFinite(servingQuantity) && servingQuantity > 0 && (servingUnit === "g" || servingUnit === "ml");

    return {
        code: String(product.code ?? ""),
        name,
        brand: String(product.brands ?? "").split(",")[0].trim() || null,
        unit: isLiquid(product) ? "ml" : "g",
        per100,
        // Ración declarada por el producto ("1 yogur (125 g)") -- solo si
        // OFF la trae en g/ml; si no, se registra por gramos y ya.
        serving: hasServing
            ? { grams: servingQuantity, label: String(product.serving_size ?? "").trim() || `${servingQuantity} ${servingUnit}` }
            : null
    };

}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchOnce(url, signal) {

    const res = await fetch(url, { signal });
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { reason: "unavailable" });

    let data;
    try {
        data = await res.json();
    } catch {
        throw Object.assign(new Error("JSON inválido"), { reason: "unexpected" });
    }

    if (!Array.isArray(data?.products)) throw Object.assign(new Error("Respuesta sin products"), { reason: "unexpected" });

    return data.products;

}

// query -> { ok: true, products } | { ok: false, reason }. Nunca lanza
// (salvo AbortError, que quien llama descarta: es una búsqueda sustituida
// por otra más nueva). reason: "offline" | "unavailable" | "unexpected".
export async function searchFoods(query, { signal } = {}) {

    const key = normalizeQuery(query);
    if (cache.has(key)) return { ok: true, products: cache.get(key) };

    const params = new URLSearchParams({
        search_terms: key,
        search_simple: "1",
        action: "process",
        json: "1",
        page_size: String(PAGE_SIZE),
        sort_by: "unique_scans_n",
        fields: FIELDS
    });
    const url = `${SEARCH_URL}?${params}`;

    let lastError = null;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {

        if (attempt > 0) await wait(RETRY_DELAYS_MS[attempt - 1]);
        if (signal?.aborted) throw new DOMException("Búsqueda sustituida", "AbortError");

        try {

            const products = (await fetchOnce(url, signal)).map(normalizeProduct).filter(Boolean);
            cache.set(key, products);
            return { ok: true, products };

        } catch (err) {

            if (err.name === "AbortError") throw err;
            lastError = err;
            // Una respuesta con forma inesperada no se arregla reintentando.
            if (err.reason === "unexpected") break;

        }

    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) return { ok: false, reason: "offline" };

    return { ok: false, reason: lastError?.reason ?? "unavailable" };

}

// Macros de una cantidad (g o ml) a partir de los valores por 100 -- un
// valor que el producto no trae sigue siendo null, nunca 0.
export function macrosForAmount(per100, grams) {

    // Un decimal (g de macro), redondeado solo al final.
    const scale = value => (value == null ? null : Math.round(value * grams / 10) / 10);

    return {
        kcal: per100.kcal == null ? null : Math.round(per100.kcal * grams / 100),
        protein: scale(per100.protein),
        carbs: scale(per100.carbs),
        fat: scale(per100.fat)
    };

}
