// Tiempo EN VIVO por geolocalización real del dispositivo -- para el
// badge de MasterCard en Inicio (Fase 1 de 3). A propósito una fuente de
// ubicación distinta a la del widget "Hoy" (HourlyWeather.js/
// hourlyForecast.js, que usa el GPS/texto del entreno más reciente,
// decisión ya tomada -- ver feedback_weather_location_source): esto es
// "dónde estoy AHORA MISMO", no "dónde entrené la última vez".
//
// Reutiliza tal cual el mismo cliente de Open-Meteo ya existente
// (fetchOpenMeteoForecast, services/hourlyForecast.js) -- mismo endpoint
// "forecast" con el bloque "current", mismo parseo, mismo mapeo de
// weathercode (WMO) a categoría. Solo cambia de dónde sale la lat/lon.
import { fetchOpenMeteoForecast } from "./hourlyForecast.js";

// Ni "alta precisión" (gasta más batería/GPS, innecesario para "qué
// tiempo hace en esta ciudad") ni sin límite de tiempo -- un permiso ya
// concedido pero con el GPS tardando (interior, mala señal) no debe
// dejar el badge "cargando" indefinidamente.
const GEOLOCATION_TIMEOUT_MS = 10000;

// Promisifica navigator.geolocation.getCurrentPosition -- API nativa por
// callbacks, no por promesas. Nunca inventa una ubicación: sin soporte del
// navegador, sin permiso concedido, o timeout, rechaza sin más (quien
// llama decide qué hacer, ver getCurrentWeatherAtDeviceLocation).
function getDeviceCoordinates() {

    return new Promise((resolve, reject) => {

        if (!("geolocation" in navigator)) {
            reject(new Error("Geolocalización no soportada por este navegador."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
            error => reject(error),
            { enableHighAccuracy: false, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 0 }
        );

    });

}

// { temp, icon } o null -- nunca lanza (permiso denegado, geolocalización
// no soportada, timeout, sin red, o la propia API sin datos "current" son
// todos el mismo resultado desde el punto de vista de quien llama: "no
// hay tiempo en vivo que mostrar", nunca un dato fabricado ni un widget
// roto). onLog opcional, mismo patrón que el resto de services/*.
export async function getCurrentWeatherAtDeviceLocation(onLog = () => {}) {

    try {

        const { lat, lon } = await getDeviceCoordinates();
        onLog(`tiempo en vivo: ubicación real obtenida (${lat.toFixed(3)}, ${lon.toFixed(3)})`);

        const forecast = await fetchOpenMeteoForecast(lat, lon, onLog);
        return forecast?.current ?? null;

    } catch (err) {

        // GeolocationPositionError trae .code/.message propios (no
        // siempre .message legible) -- se registra lo que haya, nunca se
        // bloquea el flujo por esto.
        onLog(`tiempo en vivo: no disponible -- ${err?.message || err?.code || err}`);
        return null;

    }

}
