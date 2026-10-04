import { describe, it, expect, vi, afterEach } from "vitest";

const fetchOpenMeteoForecastMock = vi.fn();
const resolveMock = vi.fn();
const requestMock = vi.fn();

vi.mock("./hourlyForecast.js", () => ({
    fetchOpenMeteoForecast: (...args) => fetchOpenMeteoForecastMock(...args)
}));

vi.mock("./weatherLocation.js", () => ({
    resolveLiveWeatherLocation: (...args) => resolveMock(...args),
    requestLiveWeatherDeviceLocation: (...args) => requestMock(...args)
}));

const { getLiveWeather } = await import("./currentWeather.js");

describe("getLiveWeather -- tiempo en vivo del badge de MasterCard", () => {

    afterEach(() => {
        fetchOpenMeteoForecastMock.mockReset();
        resolveMock.mockReset();
        requestMock.mockReset();
    });

    it("con ubicación resuelta y Open-Meteo respondiendo, devuelve el bloque current con su fuente", async () => {

        resolveMock.mockResolvedValue({ lat: 37.6, lon: -1.13, source: "localidad" });
        fetchOpenMeteoForecastMock.mockResolvedValue({ hours: [], current: { temp: 22, icon: "sun" } });

        const result = await getLiveWeather({ localidad: "Murcia" });

        expect(result).toEqual({ temp: 22, icon: "sun", source: "localidad" });
        expect(resolveMock).toHaveBeenCalledWith("Murcia", expect.any(Function));
        expect(requestMock).not.toHaveBeenCalled();
        expect(fetchOpenMeteoForecastMock).toHaveBeenCalledWith(37.6, -1.13, expect.any(Function));

    });

    it("manual=true pide el GPS directamente (Usar mi ubicación actual)", async () => {

        requestMock.mockResolvedValue({ lat: 40.4, lon: -3.7, source: "gps" });
        fetchOpenMeteoForecastMock.mockResolvedValue({ current: { temp: 15, icon: "rain" } });

        const result = await getLiveWeather({ manual: true });

        expect(result).toEqual({ temp: 15, icon: "rain", source: "gps" });
        expect(resolveMock).not.toHaveBeenCalled();

    });

    it("sin ubicación, devuelve null sin llamar a Open-Meteo", async () => {

        resolveMock.mockResolvedValue(null);

        expect(await getLiveWeather()).toBeNull();
        expect(fetchOpenMeteoForecastMock).not.toHaveBeenCalled();

    });

    it("con Open-Meteo sin bloque current (o caído), devuelve null", async () => {

        resolveMock.mockResolvedValue({ lat: 37.6, lon: -1.13, source: "gps" });
        fetchOpenMeteoForecastMock.mockResolvedValue(null);

        expect(await getLiveWeather()).toBeNull();

    });

    it("nunca lanza -- cualquier fallo inesperado también resuelve a null", async () => {

        resolveMock.mockRejectedValue(new Error("boom"));

        await expect(getLiveWeather()).resolves.toBeNull();

    });

});
