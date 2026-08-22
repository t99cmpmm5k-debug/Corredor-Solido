import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    HOURS_AHEAD,
    mostRecentLocatableWorkout,
    weatherIconForCode,
    parseForecastHours,
    resolveLocation,
    getHourlyForecast
} from "./hourlyForecast.js";

describe("mostRecentLocatableWorkout", () => {

    it("elige el más reciente por fecha+hora entre los que tienen alguna ubicación", () => {

        const workouts = [
            { id: "a", date: "2026-08-01", time: "07:00", location: "Águilas, Murcia" },
            { id: "b", date: "2026-08-20", time: "18:30", startLat: 37.4, startLon: -1.6 },
            { id: "c", date: "2026-08-10", time: "09:00" } // sin ubicación
        ];

        expect(mostRecentLocatableWorkout(workouts).id).toBe("b");

    });

    it("ignora los que no tienen ni GPS ni location", () => {

        const workouts = [{ id: "sin-ubicacion", date: "2026-08-20" }];

        expect(mostRecentLocatableWorkout(workouts)).toBeNull();

    });

    it("devuelve null si no hay ningún workout", () => {

        expect(mostRecentLocatableWorkout([])).toBeNull();

    });

});

describe("weatherIconForCode", () => {

    it("cielo despejado de día es sol, de noche es luna -- según is_day, no una hora calculada a mano", () => {

        expect(weatherIconForCode(0, true)).toBe("sun");
        expect(weatherIconForCode(1, false)).toBe("moon");

    });

    it("agrupa lluvia, nieve y tormenta en sus categorías", () => {

        expect(weatherIconForCode(61)).toBe("rain");
        expect(weatherIconForCode(75)).toBe("snow");
        expect(weatherIconForCode(95)).toBe("storm");

    });

    it("nublado y cualquier código desconocido caen a cloud, nunca a algo más específico sin certeza", () => {

        expect(weatherIconForCode(3)).toBe("cloud");
        expect(weatherIconForCode(999)).toBe("cloud");
        expect(weatherIconForCode(null)).toBe("cloud");

    });

});

describe("parseForecastHours", () => {

    it("recorta desde la hora actual, HOURS_AHEAD horas, sin inventar ninguna", () => {

        const data = {
            hourly: {
                time: ["2026-08-22T10:00", "2026-08-22T11:00", "2026-08-22T12:00", "2026-08-22T13:00"],
                temperature_2m: [22, 23.4, 25, 26],
                weathercode: [0, 1, 2, 3],
                is_day: [1, 1, 1, 1]
            }
        };

        const now = new Date("2026-08-22T11:15:00");
        const hours = parseForecastHours(data, now);

        expect(hours).toEqual([
            { time: "11:00", temp: 23, icon: "sun" },
            { time: "12:00", temp: 25, icon: "cloud" },
            { time: "13:00", temp: 26, icon: "cloud" }
        ]);

    });

    it("respeta HOURS_AHEAD como tope, no devuelve el día entero", () => {

        const times = Array.from({ length: 48 }, (_, i) => `2026-08-22T${String(i % 24).padStart(2, "0")}:00`);
        const temps = times.map(() => 20);
        const codes = times.map(() => 0);
        const isDay = times.map(() => 1);

        const hours = parseForecastHours(
            { hourly: { time: times, temperature_2m: temps, weathercode: codes, is_day: isDay } },
            new Date("2026-08-22T00:15:00")
        );

        expect(hours).toHaveLength(HOURS_AHEAD);

    });

    it("sin horas en la respuesta, devuelve un array vacío -- nunca inventa una hora", () => {

        expect(parseForecastHours({ hourly: {} })).toEqual([]);
        expect(parseForecastHours({})).toEqual([]);

    });

});

describe("resolveLocation", () => {

    it("sin ningún workout con ubicación, devuelve null (el widget se oculta, no se llama a ninguna API)", async () => {

        const result = await resolveLocation([{ id: "x", date: "2026-08-22" }]);
        expect(result).toBeNull();

    });

    it("usa el GPS del workout más reciente y su location de texto como label, sin llamar a geocoding", async () => {

        const fetchSpy = vi.spyOn(globalThis, "fetch");

        const result = await resolveLocation([
            { id: "a", date: "2026-08-22", time: "08:00", startLat: 37.994, startLon: -1.867, location: "Ojós, Murcia" }
        ]);

        expect(result).toEqual({ lat: 37.994, lon: -1.867, label: "Ojós" });
        expect(fetchSpy).not.toHaveBeenCalled();

        fetchSpy.mockRestore();

    });

    it("sin GPS, geocodifica el texto restringido a España -- sin resultados (p. ej. fuera de España) devuelve null", async () => {

        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ results: [] })
        });

        const result = await resolveLocation([
            { id: "a", date: "2026-08-22", time: "08:00", location: "Un sitio que no existe en España" }
        ]);

        expect(result).toBeNull();

        vi.restoreAllMocks();

    });

});

describe("getHourlyForecast", () => {

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("con ubicación disponible, devuelve hours + current + label a partir de la respuesta real de Open-Meteo", async () => {

        const workouts = [
            { id: "a", date: "2026-08-22", time: "08:00", startLat: 37.994, startLon: -1.867, location: "Ojós, Murcia" }
        ];

        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({
                current: { temperature_2m: 24.6, weathercode: 1, is_day: 1 },
                hourly: {
                    time: ["2026-08-22T10:00", "2026-08-22T11:00"],
                    temperature_2m: [24, 25],
                    weathercode: [1, 1],
                    is_day: [1, 1]
                }
            })
        });

        const result = await getHourlyForecast(workouts, () => {});

        expect(result.label).toBe("Ojós");
        expect(result.current).toEqual({ temp: 25, icon: "sun" });
        expect(result.hours.length).toBeGreaterThan(0);

    });

    it("si la API responde con error HTTP, devuelve null -- no se inventa nada, el widget se oculta", async () => {

        const workouts = [{ id: "a", date: "2026-08-22", startLat: 37.9, startLon: -1.8 }];

        vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 500 });

        expect(await getHourlyForecast(workouts, () => {})).toBeNull();

    });

    it("si fetch lanza una excepción (sin conexión), devuelve null en vez de propagar el error", async () => {

        const workouts = [{ id: "a", date: "2026-08-22", startLat: 37.9, startLon: -1.8 }];

        vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

        expect(await getHourlyForecast(workouts, () => {})).toBeNull();

    });

    it("sin ningún workout con ubicación, devuelve null sin llegar a llamar a fetch", async () => {

        const fetchSpy = vi.spyOn(globalThis, "fetch");

        expect(await getHourlyForecast([{ id: "a", date: "2026-08-22" }], () => {})).toBeNull();
        expect(fetchSpy).not.toHaveBeenCalled();

    });

});
