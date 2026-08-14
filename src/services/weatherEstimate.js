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
async function geocodeLocation(name) {

    const url = `${GEOCODING_URL}?name=${encodeURIComponent(name)}&count=10&language=es&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const results = data.results || [];
    if (!results.length) return null;

    const best = results.reduce((a, b) => (b.population || 0) > (a.population || 0) ? b : a);

    return { lat: best.latitude, lon: best.longitude };

}

async function fetchHourlyTemperature(lat, lon, dateStr, hour) {

    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        start_date: dateStr,
        end_date: dateStr,
        hourly: "temperature_2m",
        timezone: "auto"
    });

    const res = await fetch(`${ARCHIVE_URL}?${params}`);
    if (!res.ok) return null;

    const data = await res.json();
    const times = data.hourly?.time || [];
    const temps = data.hourly?.temperature_2m || [];
    if (!times.length) return null;

    const targetHour = `${dateStr}T${String(hour).padStart(2, "0")}:00`;
    const index = times.indexOf(targetHour);

    return index !== -1 && temps[index] != null ? temps[index] : null;

}

// workout: necesita date + (startLat/startLon, o location como texto).
// Sin fecha, o sin ninguna pista de ubicación, no hay nada que consultar.
export async function estimateTemperature(workout) {

    if (!workout.date) return null;

    let lat = workout.startLat;
    let lon = workout.startLon;

    if (lat == null || lon == null) {

        if (!workout.location) return null;

        try {

            const geo = await geocodeLocation(workout.location);
            if (!geo) return null;

            lat = geo.lat;
            lon = geo.lon;

        } catch {
            return null;
        }

    }

    const hour = workout.time ? parseInt(workout.time.split(":")[0], 10) : 12;

    try {

        const temp = await fetchHourlyTemperature(lat, lon, workout.date, hour);
        return temp != null ? Math.round(temp * 10) / 10 : null;

    } catch {
        return null;
    }

}
