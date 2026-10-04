// Tiempo EN VIVO para el badge de MasterCard en Inicio. A propósito una
// fuente de ubicación distinta a la del widget "Hoy" (HourlyWeather.js/
// hourlyForecast.js, que usa el GPS/texto del entreno más reciente,
// decisión ya tomada -- ver feedback_weather_location_source): esto es
// "dónde estoy ahora", no "dónde entrené la última vez". De dónde sale
// la lat/lon (GPS guardado, localidad de Perfil, o GPS pedido de nuevo)
// lo decide services/weatherLocation.js.
//
// Reutiliza tal cual el mismo cliente de Open-Meteo ya existente
// (fetchOpenMeteoForecast, services/hourlyForecast.js) -- mismo endpoint
// "forecast" con el bloque "current", mismo parseo, mismo mapeo de
// weathercode (WMO) a categoría.
import { fetchOpenMeteoForecast } from "./hourlyForecast.js";
import { resolveLiveWeatherLocation, requestLiveWeatherDeviceLocation } from "./weatherLocation.js";

// { temp, icon, source } o null -- nunca lanza (sin ubicación, permiso
// denegado, sin red, o la propia API sin datos "current" son todos el
// mismo resultado para quien llama: "no hay tiempo en vivo que mostrar",
// nunca un dato fabricado). manual=true es "Usar mi ubicación actual":
// pide el GPS aunque haya localidad o una negativa recordada.
export async function getLiveWeather({ localidad = null, manual = false } = {}, onLog = () => {}) {

    try {

        const location = manual
            ? await requestLiveWeatherDeviceLocation(onLog)
            : await resolveLiveWeatherLocation(localidad, onLog);

        if (!location) return null;

        onLog(`tiempo en vivo: ubicación (${location.source}) ${location.lat.toFixed(3)}, ${location.lon.toFixed(3)}`);

        const forecast = await fetchOpenMeteoForecast(location.lat, location.lon, onLog);
        return forecast?.current ? { ...forecast.current, source: location.source } : null;

    } catch (err) {

        onLog(`tiempo en vivo: no disponible -- ${err?.message || err?.code || err}`);
        return null;

    }

}
