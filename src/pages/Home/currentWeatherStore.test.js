// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";

const getCurrentWeatherAtDeviceLocationMock = vi.fn();
const rerenderMock = vi.fn();

vi.mock("../../services/currentWeather.js", () => ({
    getCurrentWeatherAtDeviceLocation: (...args) => getCurrentWeatherAtDeviceLocationMock(...args)
}));

vi.mock("../../core/router.js", () => ({
    rerender: (...args) => rerenderMock(...args)
}));

const CACHE_KEY = "corredor-solido-current-weather";

describe("currentWeatherStore -- caché en localStorage del tiempo en vivo", () => {

    beforeEach(() => {

        localStorage.clear();
        getCurrentWeatherAtDeviceLocationMock.mockReset();
        rerenderMock.mockReset();
        vi.resetModules();

    });

    it("sin caché previa, pide el dato real (geolocalización + Open-Meteo) y lo guarda con marca de tiempo", async () => {

        getCurrentWeatherAtDeviceLocationMock.mockResolvedValue({ temp: 22, icon: "sun" });

        const { loadCurrentWeather, getCurrentWeatherState } = await import("./currentWeatherStore.js");

        loadCurrentWeather();
        expect(getCurrentWeatherState().status).toBe("loading");

        await vi.waitFor(() => expect(getCurrentWeatherState().status).toBe("ready"));

        expect(getCurrentWeatherState()).toEqual({ status: "ready", temp: 22, icon: "sun" });
        expect(rerenderMock).toHaveBeenCalledWith({ resetScroll: true });

        const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
        expect(cached.temp).toBe(22);
        expect(cached.icon).toBe("sun");
        expect(typeof cached.savedAt).toBe("number");

    });

    it("con caché reciente (dentro del TTL), usa el valor guardado y NO vuelve a pedir geolocalización/red", async () => {

        localStorage.setItem(CACHE_KEY, JSON.stringify({ temp: 18, icon: "cloud", savedAt: Date.now() }));

        const { loadCurrentWeather, getCurrentWeatherState } = await import("./currentWeatherStore.js");

        loadCurrentWeather();

        expect(getCurrentWeatherState()).toEqual({ status: "ready", temp: 18, icon: "cloud" });
        expect(getCurrentWeatherAtDeviceLocationMock).not.toHaveBeenCalled();

    });

    it("con caché caducada (más allá del TTL), la descarta y pide el dato real de nuevo", async () => {

        const staleTimestamp = Date.now() - 25 * 60 * 1000; // 25 min, por encima del TTL de 20 min
        localStorage.setItem(CACHE_KEY, JSON.stringify({ temp: 18, icon: "cloud", savedAt: staleTimestamp }));

        getCurrentWeatherAtDeviceLocationMock.mockResolvedValue({ temp: 25, icon: "sun" });

        const { loadCurrentWeather, getCurrentWeatherState } = await import("./currentWeatherStore.js");

        loadCurrentWeather();

        expect(getCurrentWeatherState().status).toBe("loading");
        expect(getCurrentWeatherAtDeviceLocationMock).toHaveBeenCalled();

        await vi.waitFor(() => expect(getCurrentWeatherState().status).toBe("ready"));
        expect(getCurrentWeatherState().temp).toBe(25);

    });

    it("permiso denegado / geolocalización no disponible / fallo de red (getCurrentWeatherAtDeviceLocation resuelve null) -- status pasa a unavailable, nunca a un dato inventado", async () => {

        getCurrentWeatherAtDeviceLocationMock.mockResolvedValue(null);

        const { loadCurrentWeather, getCurrentWeatherState } = await import("./currentWeatherStore.js");

        loadCurrentWeather();

        await vi.waitFor(() => expect(getCurrentWeatherState().status).toBe("unavailable"));

        expect(getCurrentWeatherState()).toEqual({ status: "unavailable", temp: null, icon: null });
        expect(localStorage.getItem(CACHE_KEY)).toBeNull();

    });

    it("es idempotente -- llamar dos veces seguidas no dispara una segunda petición mientras la primera sigue en curso", async () => {

        let resolvePromise;
        getCurrentWeatherAtDeviceLocationMock.mockReturnValue(new Promise(resolve => { resolvePromise = resolve; }));

        const { loadCurrentWeather } = await import("./currentWeatherStore.js");

        loadCurrentWeather();
        loadCurrentWeather();

        expect(getCurrentWeatherAtDeviceLocationMock).toHaveBeenCalledTimes(1);

        resolvePromise({ temp: 20, icon: "cloud" });

    });

    it("una caché con JSON corrupto en localStorage se trata como si no hubiera caché, sin romper nada", async () => {

        localStorage.setItem(CACHE_KEY, "esto no es JSON válido");
        getCurrentWeatherAtDeviceLocationMock.mockResolvedValue({ temp: 20, icon: "cloud" });

        const { loadCurrentWeather, getCurrentWeatherState } = await import("./currentWeatherStore.js");

        expect(() => loadCurrentWeather()).not.toThrow();
        expect(getCurrentWeatherAtDeviceLocationMock).toHaveBeenCalled();

    });

});
