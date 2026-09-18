// Nombre de ciudad/pueblo real a partir de coordenadas GPS, vía reverse
// geocoding de Nominatim (OpenStreetMap) -- SOLO para entrenos con GPS real
// (GPX/TCX, ver initRunningEvents.js: maybeResolveLocationCity() solo se
// llama desde los handlers de esos dos formatos). Nunca para OCR de Garmin
// (ya trae su propio `location` de texto extraído de la captura) ni para
// entrenos manuales (sin coordenadas) -- ningún caso pasa por aquí.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

// zoom=10 -- nivel "ciudad" en la escala de detalle de Nominatim (2 es
// continente, 10 ciudad/pueblo, 18 edificio) -- ni barrio ni provincia,
// justo el nivel que se pide mostrar.
const ZOOM_LEVEL = 10;

// Política de uso de Nominatim (operations.osmfoundation.org/policies/
// nominatim/): exige un User-Agent identificable O un Referer válido --
// un fetch() del navegador NO PUEDE fijar el header User-Agent (está en la
// lista de headers prohibidos del propio estándar Fetch; el navegador lo
// ignora en silencio si se intenta), así que aquí NO se intenta poner uno
// -- sería código muerto que aparentaría cumplir la política sin hacerlo
// de verdad. El Referer que el navegador manda solo por ser una petición
// real desde esta app (la URL de GitHub Pages) es la identificación válida
// real en este caso -- no hay ningún meta "referrer-policy" restrictivo en
// index.html que lo recorte.
//
// El otro requisito real de la política SÍ es controlable desde aquí: máximo
// 1 petición/segundo. throttle() lo aplica encolando cada llamada detrás de
// la anterior con al menos MIN_INTERVAL_MS de por medio -- hoy la app solo
// importa un GPX/TCX de cada vez (nunca varios en paralelo), así que esto
// no se ejercita en la práctica todavía, pero es barato de tener listo por
// si el flujo de importación alguna vez procesa varios a la vez.
const MIN_INTERVAL_MS = 1000;

// Momento más temprano en que la PRÓXIMA llamada puede salir -- cada
// llamada real reserva su propio hueco de MIN_INTERVAL_MS avanzando esta
// marca, así que llamadas que lleguen en ráfaga se van espaciando en cola
// en vez de compararse solo contra "la última que salió" (eso permitiría
// que dos llamadas casi simultáneas calculasen la misma espera y salieran
// juntas de todos modos).
let nextAvailableAt = 0;

function throttle() {

    const now = Date.now();
    const runAt = Math.max(now, nextAvailableAt);

    nextAvailableAt = runAt + MIN_INTERVAL_MS;

    const wait = runAt - now;
    return wait > 0 ? new Promise(resolve => setTimeout(resolve, wait)) : Promise.resolve();

}

// Orden de preferencia real de Nominatim para "ciudad/pueblo" -- varía
// según el tamaño real del núcleo de población (city para ciudades
// grandes, town/village para más pequeños) y municipality como respaldo
// administrativo si ninguno de esos tres viene. Nunca se cae a
// barrio/calle/provincia/país -- si ninguno de estos 4 campos viene, no
// hay nombre de ciudad que mostrar (null), nunca un dato aproximado.
function extractCityName(address) {
    return address?.city || address?.town || address?.village || address?.municipality || null;
}

// { lat, lon } -> nombre de ciudad/pueblo real, o null. Nunca lanza --
// cualquier fallo (sin red, HTTP no-ok, JSON inválido, o respuesta sin
// ninguno de los 4 campos reconocidos) es el mismo resultado desde el
// punto de vista de quien llama: "no hay nombre que mostrar", nunca un
// dato inventado ni una importación bloqueada por esto.
export async function reverseGeocodeCity(lat, lon, onLog = () => {}) {

    await throttle();

    const params = new URLSearchParams({ format: "json", lat, lon, zoom: ZOOM_LEVEL });
    const url = `${NOMINATIM_URL}?${params}`;
    onLog(`ciudad: GET ${url}`);

    try {

        const res = await fetch(url);

        if (!res.ok) {
            onLog(`ciudad: Nominatim respondió HTTP ${res.status}`);
            return null;
        }

        const data = await res.json();
        const city = extractCityName(data?.address);

        onLog(city ? `ciudad: -> ${city}` : "ciudad: respuesta sin ciudad/pueblo reconocible");

        return city;

    } catch (err) {

        onLog(`ciudad: excepción -- ${err.message}`);
        return null;

    }

}
