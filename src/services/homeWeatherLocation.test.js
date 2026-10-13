// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Tarjeta "Hoy · <lugar>" de Inicio (2026-10-13): misma ubicación que la
// insignia de temperatura (GPS reciente -> localidad de Perfil) y, si no
// hay ninguna, el último entreno; el nombre siempre de la fuente usada.

const geocodeMock = vi.fn();
const reverseMock = vi.fn();
const workoutCoordsMock = vi.fn();

vi.mock("./weatherEstimate.js", () => ({
    geocodeLocation: (...args) => geocodeMock(...args),
    resolveWorkoutCoordinates: (...args) => workoutCoordsMock(...args)
}));

vi.mock("./reverseGeocode.js", () => ({
    reverseGeocodeCity: (...args) => reverseMock(...args)
}));

const { resolveHomeWeatherLocation, resolveDevicePositionName, roundCoordinate, POSITION_TTL_MS } = await import("./weatherLocation.js");
const { getHourlyForecast } = await import("./hourlyForecast.js");

const POSITION_KEY = "corredor-solido-device-position";

function savePosition(extra = {}, savedAt = Date.now()) {

    localStorage.setItem(POSITION_KEY, JSON.stringify({ lat: 37.55871, lon: -1.81234, savedAt, ...extra }));

}

const savedPosition = () => JSON.parse(localStorage.getItem(POSITION_KEY));

function stubForecast() {

    return vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
            current: { temperature_2m: 21, weathercode: 1, is_day: 1 },
            hourly: { time: ["2026-10-13T10:00", "2026-10-13T11:00"], temperature_2m: [20, 21], weathercode: [1, 1], is_day: [1, 1] }
        })
    });

}

const WORKOUTS = [{ id: "w", date: "2026-10-12", time: "08:00", startLat: 37.99, startLon: -1.86, location: "Ojós, Murcia" }];

describe("tarjeta 'Hoy · <lugar>' -- ubicación y nombre", () => {

    beforeEach(() => {
        localStorage.clear();
        geocodeMock.mockReset();
        reverseMock.mockReset();
        workoutCoordsMock.mockReset().mockResolvedValue({ lat: 37.99, lon: -1.86 });
        // Nunca se pide permiso desde Inicio: si se llamara, el test lo vería.
        vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: vi.fn() } });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("GPS reciente con nombre: el municipio de esa posición, aunque haya localidad en Perfil", async () => {

        savePosition();
        reverseMock.mockResolvedValue("Puerto Lumbreras");

        const location = await resolveHomeWeatherLocation("Murcia");

        expect(location).toEqual({ lat: 37.55871, lon: -1.81234, source: "gps", label: "Puerto Lumbreras" });
        expect(geocodeMock).not.toHaveBeenCalled();
        expect(savedPosition().name).toBe("Puerto Lumbreras");

    });

    it("redondea las coordenadas a 2 decimales antes de enviarlas", async () => {

        savePosition();
        reverseMock.mockResolvedValue("Puerto Lumbreras");

        await resolveHomeWeatherLocation(null);

        expect(reverseMock).toHaveBeenCalledWith(37.56, -1.81, expect.any(Function));
        expect(roundCoordinate(-1.815)).toBe(-1.81);

    });

    it("caché: con el nombre guardado no vuelve a llamar; dentro de las 12 h, ni tras un fallo", async () => {

        savePosition();
        reverseMock.mockResolvedValue("Puerto Lumbreras");

        await resolveHomeWeatherLocation(null);
        await resolveHomeWeatherLocation(null);
        expect(reverseMock).toHaveBeenCalledTimes(1);

        localStorage.clear();
        savePosition();
        reverseMock.mockReset().mockResolvedValue(null);

        expect((await resolveHomeWeatherLocation(null)).label).toBe(null);
        expect((await resolveHomeWeatherLocation(null)).label).toBe(null);
        expect(reverseMock).toHaveBeenCalledTimes(1);

    });

    it("pasadas las 12 h la posición caduca: ni GPS ni llamada (se usa Perfil)", async () => {

        savePosition({ name: "Puerto Lumbreras" }, Date.now() - POSITION_TTL_MS - 1000);
        geocodeMock.mockResolvedValue({ lat: 37.98, lon: -1.13 });

        const location = await resolveHomeWeatherLocation("Murcia");

        expect(location).toEqual({ lat: 37.98, lon: -1.13, source: "localidad", label: "Murcia" });
        expect(reverseMock).not.toHaveBeenCalled();

    });

    it("GPS sin nombre (Nominatim falla o lanza): título sin lugar, sin romper nada", async () => {

        savePosition();
        reverseMock.mockRejectedValue(new TypeError("Failed to fetch"));

        const location = await resolveHomeWeatherLocation(null);

        expect(location).toEqual({ lat: 37.55871, lon: -1.81234, source: "gps", label: null });
        expect(await resolveDevicePositionName()).toBe(null);
        expect(reverseMock).toHaveBeenCalledTimes(1);

    });

    it("sin GPS y con localidad de Perfil: esa localidad, sin geocodificación inversa", async () => {

        geocodeMock.mockResolvedValue({ lat: 37.56, lon: -1.81 });

        const location = await resolveHomeWeatherLocation("  Puerto Lumbreras ");

        expect(location).toEqual({ lat: 37.56, lon: -1.81, source: "localidad", label: "Puerto Lumbreras" });
        expect(reverseMock).not.toHaveBeenCalled();

    });

    it("sin GPS ni localidad: null y nunca pide el permiso de ubicación", async () => {

        expect(await resolveHomeWeatherLocation(null)).toBe(null);
        expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();

    });

    it("getHourlyForecast: GPS -> municipio; Perfil -> localidad; nada -> último entreno (con y sin location)", async () => {

        stubForecast();

        savePosition();
        reverseMock.mockResolvedValue("Puerto Lumbreras");
        expect((await getHourlyForecast(WORKOUTS, () => {}, { localidad: "Murcia" })).label).toBe("Puerto Lumbreras");

        localStorage.clear();
        geocodeMock.mockResolvedValue({ lat: 37.98, lon: -1.13 });
        expect((await getHourlyForecast(WORKOUTS, () => {}, { localidad: "Murcia" })).label).toBe("Murcia");

        geocodeMock.mockReset();
        expect((await getHourlyForecast(WORKOUTS, () => {}, { localidad: null })).label).toBe("Ojós");

        const withoutText = [{ id: "w", date: "2026-10-12", startLat: 37.99, startLon: -1.86 }];
        expect((await getHourlyForecast(withoutText, () => {}, { localidad: null })).label).toBe(null);

    });

    it("localidad de Perfil que no se puede geocodificar: último entreno (nunca la localidad con otras coordenadas)", async () => {

        stubForecast();
        geocodeMock.mockResolvedValue(null);

        const result = await getHourlyForecast(WORKOUTS, () => {}, { localidad: "Sitio inexistente" });

        expect(result.label).toBe("Ojós");

    });

});
