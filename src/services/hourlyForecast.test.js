import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    HOURS_AHEAD,
    mostRecentLocatableWorkout,
    weatherIconForCode,
    parseForecastHours,
    findBestRunningHour,
    remainingHours,
    todayRemainingHours,
    isFavorableHour,
    isNowWithinHour,
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
            { time: "11:00", temp: 23, icon: "sun", isNewDay: false, windKmh: null, humidity: null },
            { time: "12:00", temp: 25, icon: "cloud", isNewDay: false, windKmh: null, humidity: null },
            { time: "13:00", temp: 26, icon: "cloud", isNewDay: false, windKmh: null, humidity: null }
        ]);

    });

    // 48 horas reales consecutivas (dos días de verdad, con el cambio de
    // fecha en la posición correcta) -- a diferencia de un `i % 24` que
    // repetiría la misma fecha dos veces, esto deja probar tanto el tope
    // de HOURS_AHEAD como el separador de día sobre datos realistas.
    function twoRealDaysOfHours(startIso) {

        const times = Array.from({ length: 48 }, (_, i) => {
            const d = new Date(startIso);
            d.setHours(d.getHours() + i);
            const pad = n => String(n).padStart(2, "0");
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
        });

        return {
            hourly: {
                time: times,
                temperature_2m: times.map(() => 20),
                weathercode: times.map(() => 0),
                is_day: times.map(() => 1)
            }
        };

    }

    it("respeta HOURS_AHEAD como tope, no devuelve el día entero", () => {

        const hours = parseForecastHours(
            twoRealDaysOfHours("2026-08-22T00:00"),
            new Date("2026-08-22T00:15:00")
        );

        expect(hours).toHaveLength(HOURS_AHEAD);

    });

    it("con 24h fijas desde la hora actual, cubre hasta la misma hora del día siguiente y marca la primera hora de mañana", () => {

        // Mirado de día (10:15) -- las 24h llegan hasta las 10:00 de mañana.
        const hours = parseForecastHours(
            twoRealDaysOfHours("2026-08-22T00:00"),
            new Date("2026-08-22T10:15:00")
        );

        expect(hours).toHaveLength(HOURS_AHEAD);
        expect(hours[0].time).toBe("10:00");
        expect(hours.at(-1).time).toBe("09:00"); // 24ª hora = 10:00 de hoy + 23h = 09:00 de mañana

        const boundaryIndex = hours.findIndex(h => h.isNewDay);
        expect(hours[boundaryIndex].time).toBe("00:00");
        expect(hours.filter(h => h.isNewDay)).toHaveLength(1); // un único cambio de día en 24h

    });

    it("mirado de noche, el separador de día cae mucho antes en la franja (cubre toda la mañana siguiente)", () => {

        const hours = parseForecastHours(
            twoRealDaysOfHours("2026-08-22T00:00"),
            new Date("2026-08-22T22:15:00")
        );

        const boundaryIndex = hours.findIndex(h => h.isNewDay);

        expect(hours[boundaryIndex].time).toBe("00:00");
        expect(boundaryIndex).toBe(2); // 22:00 (hoy), 23:00 (hoy), 00:00 (mañana) -> índice 2

    });

    it("sin horas en la respuesta, devuelve un array vacío -- nunca inventa una hora", () => {

        expect(parseForecastHours({ hourly: {} })).toEqual([]);
        expect(parseForecastHours({})).toEqual([]);

    });

    it("recorta limpio si Open-Meteo no llega a dar las 24h completas, sin rellenar con horas falsas", () => {

        // Solo 4 horas disponibles en toda la respuesta, simulando el borde
        // del pronóstico -- se cortan ahí, ninguna se inventa para llegar
        // a las 24 pedidas.
        const short = {
            hourly: {
                time: ["2026-08-22T20:00", "2026-08-22T21:00", "2026-08-22T22:00", "2026-08-22T23:00"],
                temperature_2m: [18, 17, 16, 16],
                weathercode: [0, 0, 0, 0],
                is_day: [1, 0, 0, 0]
            }
        };

        const result = parseForecastHours(short, new Date("2026-08-22T20:15:00"));

        expect(result).toHaveLength(4);
        expect(result).not.toHaveLength(HOURS_AHEAD);

    });

    it("parsea viento y humedad reales de Open-Meteo cuando la respuesta los trae", () => {

        const data = {
            hourly: {
                time: ["2026-08-22T10:00", "2026-08-22T11:00"],
                temperature_2m: [22, 23],
                weathercode: [0, 0],
                is_day: [1, 1],
                wind_speed_10m: [12.4, 9.1],
                relative_humidity_2m: [41.8, 55]
            }
        };

        const hours = parseForecastHours(data, new Date("2026-08-22T10:15:00"));

        expect(hours[0]).toMatchObject({ windKmh: 12, humidity: 42 });
        expect(hours[1]).toMatchObject({ windKmh: 9, humidity: 55 });

    });

    it("sin viento/humedad en la respuesta, quedan en null -- nunca un 0 inventado", () => {

        const data = {
            hourly: {
                time: ["2026-08-22T10:00"],
                temperature_2m: [22],
                weathercode: [0],
                is_day: [1]
            }
        };

        const hours = parseForecastHours(data, new Date("2026-08-22T10:15:00"));

        expect(hours[0].windKmh).toBeNull();
        expect(hours[0].humidity).toBeNull();

    });

});

describe("findBestRunningHour", () => {

    function hour(time, temp, icon = "sun") {
        return { time, temp, icon, isNewDay: false, windKmh: null, humidity: null };
    }

    it("sin horas, no hay nada que calcular", () => {
        expect(findBestRunningHour([])).toBeNull();
        expect(findBestRunningHour(undefined)).toBeNull();
    });

    it("elige la hora de menor temperatura entre las que no llevan lluvia/tormenta/nieve", () => {

        const hours = [
            hour("18:00", 28, "sun"),
            hour("20:00", 24, "rain"), // más fría, pero con lluvia -- se descarta
            hour("21:00", 25, "cloud"),
            hour("22:00", 23, "cloud")
        ];

        expect(findBestRunningHour(hours).time).toBe("22:00");

    });

    it("si TODAS las horas llevan precipitación, cae a la de menor temperatura entre todas", () => {

        const hours = [
            hour("18:00", 22, "rain"),
            hour("19:00", 20, "storm"),
            hour("20:00", 21, "rain")
        ];

        expect(findBestRunningHour(hours).time).toBe("19:00");

    });

    // Bug real (2026-08-26): la temperatura más baja aislada no siempre es
    // la más agradable para correr -- una hora algo más cálida pero
    // nublada y con brisa puede ganar a una despejada y en calma.
    it("no elige solo por la temperatura más baja aislada -- nubosidad y viento entran en el criterio", () => {

        const hours = [
            { time: "12:00", temp: 24, icon: "sun", isNewDay: false, windKmh: null, humidity: null },
            { time: "13:00", temp: 25, icon: "cloud", isNewDay: false, windKmh: 18, humidity: null }
        ];

        expect(findBestRunningHour(hours).time).toBe("13:00");

    });

});

describe("todayRemainingHours", () => {

    function hour(time, isNewDay = false) {
        return { time, temp: 20, icon: "sun", isNewDay, windKmh: null, humidity: null };
    }

    it("corta antes de la primera hora marcada como isNewDay -- nunca cruza la medianoche", () => {

        const hours = [hour("21:00"), hour("22:00"), hour("23:00"), hour("00:00", true), hour("01:00")];

        expect(todayRemainingHours(hours).map(h => h.time)).toEqual(["21:00", "22:00", "23:00"]);

    });

    it("sin ninguna hora de mañana en la lista, la deja tal cual", () => {

        const hours = [hour("10:00"), hour("11:00")];
        expect(todayRemainingHours(hours)).toEqual(hours);

    });

    it("si ya no queda ninguna hora de hoy, devuelve un array vacío", () => {

        const hours = [hour("00:00", true), hour("01:00")];
        expect(todayRemainingHours(hours)).toEqual([]);

    });

});

describe("isFavorableHour", () => {

    it("sin hora, no es favorable", () => {
        expect(isFavorableHour(null)).toBe(false);
    });

    it("por debajo del umbral, es favorable", () => {
        expect(isFavorableHour({ temp: 18 })).toBe(true);
    });

    it("por encima del umbral, no es favorable", () => {
        expect(isFavorableHour({ temp: 28 })).toBe(false);
    });

});

describe("isNowWithinHour", () => {

    it("sin hora, nunca está dentro", () => {
        expect(isNowWithinHour(null, new Date("2026-08-22T23:08:00"))).toBe(false);
    });

    it("con el reloj real dentro de la franja (23:08 y franja 23:00-00:00), está dentro", () => {
        expect(isNowWithinHour({ time: "23:00" }, new Date("2026-08-22T23:08:00"))).toBe(true);
    });

    it("con el reloj real todavía antes de que empiece la franja, no está dentro", () => {
        expect(isNowWithinHour({ time: "23:00" }, new Date("2026-08-22T19:30:00"))).toBe(false);
    });

    it("con el reloj real ya después de que termine la franja, no está dentro", () => {
        expect(isNowWithinHour({ time: "20:00" }, new Date("2026-08-22T21:05:00"))).toBe(false);
    });

});

describe("remainingHours", () => {

    function hour(time) {
        return { time, temp: 20, icon: "sun", isNewDay: false, windKmh: null, humidity: null };
    }

    it("descarta las horas cuyo tramo ya empezó respecto al reloj real de ahora", () => {

        const hours = [hour("08:00"), hour("09:00"), hour("10:00"), hour("11:00")];
        const now = new Date("2026-08-22T10:20:00");

        expect(remainingHours(hours, now).map(h => h.time)).toEqual(["10:00", "11:00"]);

    });

    it("la hora en curso cuenta como restante, igual que al pedir el pronóstico", () => {

        const hours = [hour("09:00"), hour("10:00")];
        const now = new Date("2026-08-22T10:59:00");

        expect(remainingHours(hours, now).map(h => h.time)).toEqual(["10:00"]);

    });

    it("un array cacheado desde hace horas puede quedarse sin ninguna hora restante, en vez de proponer una ya pasada", () => {

        const hours = [hour("08:00"), hour("09:00")];
        const now = new Date("2026-08-22T12:00:00");

        expect(remainingHours(hours, now)).toEqual([]);

    });

    it("no confunde una hora de después de medianoche con una ya pasada de hoy", () => {

        const hours = [hour("22:00"), hour("23:00"), hour("00:00"), hour("01:00")];
        const now = new Date("2026-08-22T23:30:00");

        expect(remainingHours(hours, now).map(h => h.time)).toEqual(["23:00", "00:00", "01:00"]);

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

    // Bug real 2026-08-26 ("Hoy · Puerto Lumbreras A"): un workout ya
    // importado ANTES del fix en parser-summary.js puede tener guardado
    // un location con la letra suelta de OCR sin limpiar -- esta capa
    // arregla también esos ya guardados, sin depender de reimportarlos.
    it("recorta una letra suelta de OCR que haya quedado guardada en location de un import anterior al fix", async () => {

        const result = await resolveLocation([
            { id: "a", date: "2026-08-22", time: "08:00", startLat: 37.567, startLon: -1.812, location: "Puerto Lumbreras A" }
        ]);

        expect(result.label).toBe("Puerto Lumbreras");

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
