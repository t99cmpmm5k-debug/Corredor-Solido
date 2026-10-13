// De dónde sale la lat/lon del tiempo en vivo (badge de MasterCard, ver
// currentWeatherStore.js) -- separado de currentWeather.js para que la
// decisión "¿hace falta pedir el GPS?" viva en un solo sitio.
//
// Bug real (2026-10-04): en el iPhone con la app instalada en la pantalla
// de inicio, el aviso de permiso de ubicación salía casi en cada apertura.
// Dos causas que se suman:
//   1. iOS no conserva el permiso de geolocalización de una web app entre
//      lanzamientos (limitación de la plataforma, no se arregla desde el
//      código -- permissions.query vuelve a "prompt").
//   2. Bug nuestro: se llamaba a getCurrentPosition() en CADA arranque en
//      cuanto caducaba la caché de 20 min del TIEMPO (la posición no se
//      guardaba), y una negativa no se recordaba.
// Como (1) no tiene arreglo, se reduce cuántas veces se llega a pedir:
//
// Criterio, por orden:
//   1. Posición GPS guardada de hace menos de POSITION_TTL_MS -> se reutiliza
//      sin pedir nada (nadie cambia de ciudad entre una apertura y otra).
//   2. Localidad de Perfil -> geocoding (Open-Meteo, solo España). Es la
//      fuente por defecto si existe: con localidad, el arranque NUNCA pide
//      el GPS; "Usar mi ubicación actual" (Ajustes) es la acción manual.
//   3. Negativa recordada -> sin clima (nunca se vuelve a pedir solo).
//   4. Si no, se pide el GPS (con aviso) y se guarda la posición.
// Nunca se inventa una ubicación: sin nada de lo anterior, null.
import { geocodeLocation } from "./weatherEstimate.js";
import { reverseGeocodeCity } from "./reverseGeocode.js";

const POSITION_KEY = "corredor-solido-device-position";
const DENIED_KEY = "corredor-solido-geolocation-denied";

export const POSITION_TTL_MS = 12 * 60 * 60 * 1000;

// Ni "alta precisión" (gasta más batería/GPS, innecesario para "qué
// tiempo hace en esta ciudad") ni sin límite de tiempo -- un permiso ya
// concedido pero con el GPS tardando (interior, mala señal) no debe
// dejar el badge "cargando" indefinidamente.
const GEOLOCATION_TIMEOUT_MS = 10000;

// GeolocationPositionError.PERMISSION_DENIED -- con el número a mano
// porque la constante no existe fuera del navegador (tests).
const PERMISSION_DENIED = 1;

function readJson(key) {

    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }

}

function writeJson(key, value) {

    try {
        if (value == null) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Privado/cuota -- solo se pierde la memoria entre aperturas.
    }

}

function readFreshPositionRecord(now = Date.now()) {

    const saved = readJson(POSITION_KEY);
    if (!saved || typeof saved.lat !== "number" || typeof saved.lon !== "number" || typeof saved.savedAt !== "number") return null;
    if (now - saved.savedAt > POSITION_TTL_MS) return null;

    return saved;

}

export function readFreshDevicePosition(now = Date.now()) {

    const saved = readFreshPositionRecord(now);
    return saved ? { lat: saved.lat, lon: saved.lon } : null;

}

// Coordenadas que salen hacia Nominatim: 2 decimales (~1 km), de sobra
// para saber el municipio y sin mandar la posición exacta.
export function roundCoordinate(value) {

    return Math.round(value * 100) / 100;

}

// Nombre del municipio de la posición GPS guardada, para el título de la
// tarjeta "Hoy · <lugar>" de Inicio. Se guarda junto a la posición (mismo
// registro, misma caducidad de 12 h): una posición nueva ("Usar mi
// ubicación actual") empieza sin nombre. Como mucho UNA llamada por
// posición: si sale bien se reutiliza el nombre; si falla (sin red,
// Nominatim caído, sin municipio reconocible) se recuerda el intento y no
// se vuelve a llamar hasta que caduque la posición -- el título se queda
// en "Hoy", nunca coordenadas. null si no hay posición vigente.
export async function resolveDevicePositionName(onLog = () => {}, now = Date.now()) {

    const saved = readFreshPositionRecord(now);
    if (!saved) return null;
    if (saved.name) return saved.name;
    if (typeof saved.nameTriedAt === "number") return null;

    // Se marca ANTES de la llamada: dos cargas a la vez no la repiten.
    writeJson(POSITION_KEY, { ...saved, nameTriedAt: now });

    let name = null;

    try {
        name = await reverseGeocodeCity(roundCoordinate(saved.lat), roundCoordinate(saved.lon), onLog);
    } catch (err) {
        onLog(`tiempo: nombre del lugar no disponible -- ${err?.message || err}`);
    }

    // Solo si sigue siendo la misma posición (no se pulsó "Usar mi
    // ubicación actual" mientras tanto).
    const current = readJson(POSITION_KEY);
    if (name && current && current.savedAt === saved.savedAt) writeJson(POSITION_KEY, { ...current, name });

    return name || null;

}

// La localidad de Perfil acaba de cambiar: quien la escribe espera que el
// clima la use ya, no una posición GPS de hasta 12 h antes.
export function forgetDevicePosition() {

    writeJson(POSITION_KEY, null);

}

export function isGeolocationDenied() {

    return readJson(DENIED_KEY) != null;

}

// Promisifica navigator.geolocation.getCurrentPosition. Guarda la posición
// si sale bien y la negativa si el usuario dice que no; cualquier otro
// fallo (timeout, sin soporte) no se recuerda -- no es una decisión suya.
function requestDevicePosition(onLog) {

    return new Promise(resolve => {

        if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
            onLog("tiempo en vivo: geolocalización no soportada");
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                const coords = { lat: position.coords.latitude, lon: position.coords.longitude };
                // Mismo sitio que la posición anterior (a 2 decimales): se
                // conserva su nombre en vez de volver a preguntarlo.
                const previous = readJson(POSITION_KEY);
                const samePlace = previous?.name
                    && roundCoordinate(previous.lat) === roundCoordinate(coords.lat)
                    && roundCoordinate(previous.lon) === roundCoordinate(coords.lon);
                writeJson(POSITION_KEY, { ...coords, savedAt: Date.now(), ...(samePlace ? { name: previous.name } : {}) });
                writeJson(DENIED_KEY, null);
                resolve(coords);
            },
            error => {
                if (error?.code === PERMISSION_DENIED) writeJson(DENIED_KEY, { deniedAt: Date.now() });
                onLog(`tiempo en vivo: GPS no disponible -- ${error?.message || error?.code || error}`);
                resolve(null);
            },
            { enableHighAccuracy: false, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 0 }
        );

    });

}

// Arranque: { lat, lon, source: "gps" | "localidad" } o null. Nunca lanza.
// prompt: false -> nunca pide el GPS (la tarjeta "Hoy" de Inicio: solo
// reutiliza una posición ya concedida y guardada); sin GPS ni localidad,
// null y quien llama decide.
export async function resolveLiveWeatherLocation(localidad, onLog = () => {}, { prompt = true } = {}) {

    const fresh = readFreshDevicePosition();
    if (fresh) return { ...fresh, source: "gps" };

    const name = localidad?.trim();
    if (name) {
        try {
            const coords = await geocodeLocation(name, onLog);
            if (coords) return { ...coords, source: "localidad" };
        } catch (err) {
            onLog(`tiempo en vivo: geocoding de "${name}" falló -- ${err?.message || err}`);
        }
    }

    if (!prompt || isGeolocationDenied()) return null;

    const coords = await requestDevicePosition(onLog);
    return coords ? { ...coords, source: "gps" } : null;

}

// Ubicación de la tarjeta "Hoy · <lugar>" de Inicio: la misma que la
// insignia de temperatura (GPS reciente -> localidad de Perfil), sin pedir
// permiso nunca, y con el nombre que corresponde a ESAS coordenadas: con
// GPS el municipio de la posición (resolveDevicePositionName), con Perfil
// el texto de la localidad. { lat, lon, source, label } o null (entonces
// la tarjeta usa el último entreno, como antes). Nunca lanza.
export async function resolveHomeWeatherLocation(localidad, onLog = () => {}) {

    const location = await resolveLiveWeatherLocation(localidad, onLog, { prompt: false });
    if (!location) return null;

    const label = location.source === "gps"
        ? await resolveDevicePositionName(onLog)
        : localidad.trim();

    return { ...location, label: label || null };

}

// "Usar mi ubicación actual" (acción manual en Ajustes) -- pide el GPS
// aunque haya localidad o una negativa recordada: es el propio usuario
// quien lo pide ahora.
export async function requestLiveWeatherDeviceLocation(onLog = () => {}) {

    const coords = await requestDevicePosition(onLog);
    return coords ? { ...coords, source: "gps" } : null;

}
