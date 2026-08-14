// Rellena la temperatura de una carrera cuando el reloj no la registró,
// usando la reanálisis histórica de Open-Meteo (sin API key, límites de
// sobra para el uso de la app). Es una estimación de modelo climático con
// rejilla de ~9-25km, no una medición en el punto exacto -- quien consuma
// este valor debe marcarlo como estimado, nunca presentarlo como un dato
// del reloj. Si algo falla o no hay cobertura para esa fecha/lugar, se
// devuelve null: no se inventa un número.

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

// Con varias localidades con el mismo nombre (frecuente en español:
// "San José", "Santa Ana"...) se elige la más poblada en vez de bloquear
// o de quedarse con la primera del listado, que no viene ordenada por
// relevancia real.
async function geocodeLocation(name, onLog) {

    const url = `${GEOCODING_URL}?name=${encodeURIComponent(name)}&count=10&language=es&format=json`;
    onLog(`clima: GET ${url}`);

    const res = await fetch(url);

    if (!res.ok) {
        onLog(`clima: geocoding respondió HTTP ${res.status}`);
        return null;
    }

    const data = await res.json();
    const results = data.results || [];

    if (!results.length) {
        onLog(`clima: geocoding sin resultados para "${name}"`);
        return null;
    }

    const best = results.reduce((a, b) => (b.population || 0) > (a.population || 0) ? b : a);
    const label = [best.name, best.admin1, best.country].filter(Boolean).join(", ");

    onLog(`clima: geocoding -> ${label} (lat=${best.latitude.toFixed(3)} lon=${best.longitude.toFixed(3)}, pob=${best.population ?? "?"})`);

    return { lat: best.latitude, lon: best.longitude };

}

async function fetchHourlyTemperature(lat, lon, dateStr, hour, onLog) {

    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        start_date: dateStr,
        end_date: dateStr,
        hourly: "temperature_2m",
        timezone: "auto"
    });

    const url = `${ARCHIVE_URL}?${params}`;
    onLog(`clima: GET ${url}`);

    const res = await fetch(url);

    if (!res.ok) {
        onLog(`clima: archive-api respondió HTTP ${res.status}`);
        return null;
    }

    const data = await res.json();
    const times = data.hourly?.time || [];
    const temps = data.hourly?.temperature_2m || [];

    if (!times.length) {
        onLog("clima: respuesta sin datos horarios (sin cobertura para esa fecha/lugar)");
        return null;
    }

    const targetHour = `${dateStr}T${String(hour).padStart(2, "0")}:00`;
    const index = times.indexOf(targetHour);

    onLog(`clima: hora buscada=${targetHour} -> ${index !== -1 ? `encontrada, ${temps[index]}°C` : "no está en la respuesta"}`);

    return index !== -1 && temps[index] != null ? temps[index] : null;

}

// Quita un único token final suelto de 1-2 letras (categoría de carrera
// mal separada del nombre del lugar, resto de OCR...) además de colapsar
// espacios. Deliberadamente conservador -- ver el porqué del reintento
// único en estimateTemperature().
function cleanLocationForRetry(text) {
    return text.replace(/\s+/g, " ").replace(/\s+[A-Za-z]{1,2}$/, "").trim() || null;
}

// workout: necesita date + (startLat/startLon, o location como texto).
// Sin fecha, o sin ninguna pista de ubicación, no hay nada que consultar.
// onLog(línea) es opcional -- pensado para volcar el progreso a un panel
// visible en pantalla (ver initRunningEvents.js/RunningReviewStep.js),
// no depende de devtools para depurar en el móvil.
export async function estimateTemperature(workout, onLog = () => {}) {

    if (!workout.date) {
        onLog("clima: sin fecha, no se puede estimar");
        return null;
    }

    let lat = workout.startLat;
    let lon = workout.startLon;

    if (lat == null || lon == null) {

        if (!workout.location) {
            onLog("clima: sin GPS ni ubicación de texto -- no se llama a la API");
            return null;
        }

        onLog(`clima: sin GPS, geocodificando ubicación de texto: "${workout.location}"`);

        try {

            let geo = await geocodeLocation(workout.location, onLog);

            // Un único reintento acotado, no una cadena de heurísticas cada
            // vez más agresivas -- recortar más (p. ej. quedarse solo con la
            // primera palabra) podría geocodificar una ciudad real pero
            // distinta a la que era, sin que se note en ningún sitio (location
            // no se revisa en pantalla). Peor un acierto falso que un null.
            if (!geo) {

                const cleaned = cleanLocationForRetry(workout.location);

                if (cleaned && cleaned !== workout.location) {
                    onLog(`clima: reintentando geocoding con texto simplificado: "${cleaned}"`);
                    geo = await geocodeLocation(cleaned, onLog);
                }

            }

            if (!geo) return null;

            lat = geo.lat;
            lon = geo.lon;

        } catch (err) {
            onLog(`clima: excepción en geocoding: ${err.message}`);
            return null;
        }

    } else {
        onLog(`clima: usando GPS del archivo -> lat=${lat.toFixed(3)} lon=${lon.toFixed(3)}`);
    }

    const hour = workout.time ? parseInt(workout.time.split(":")[0], 10) : 12;

    try {

        const temp = await fetchHourlyTemperature(lat, lon, workout.date, hour, onLog);
        if (temp == null) return null;

        const rounded = Math.round(temp * 10) / 10;
        onLog(`clima: temperatura estimada = ${rounded}°C`);

        return rounded;

    } catch (err) {
        onLog(`clima: excepción consultando Open-Meteo: ${err.message}`);
        return null;
    }

}
