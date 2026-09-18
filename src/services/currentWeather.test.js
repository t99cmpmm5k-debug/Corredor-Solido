import { describe, it, expect, vi, afterEach } from "vitest";

const fetchOpenMeteoForecastMock = vi.fn();

vi.mock("./hourlyForecast.js", () => ({
    fetchOpenMeteoForecast: (...args) => fetchOpenMeteoForecastMock(...args)
}));

const { getCurrentWeatherAtDeviceLocation } = await import("./currentWeather.js");

describe("getCurrentWeatherAtDeviceLocation -- tiempo en vivo por geolocalización real del dispositivo", () => {

    afterEach(() => {
        fetchOpenMeteoForecastMock.mockReset();
        vi.unstubAllGlobals();
    });

    it("con permiso concedido y Open-Meteo respondiendo, devuelve el bloque current real", async () => {

        vi.stubGlobal("navigator", {
            geolocation: {
                getCurrentPosition: (success) => success({ coords: { latitude: 37.6, longitude: -1.13 } })
            }
        });

        fetchOpenMeteoForecastMock.mockResolvedValue({ hours: [], current: { temp: 22, icon: "sun" } });

        const result = await getCurrentWeatherAtDeviceLocation();

        expect(result).toEqual({ temp: 22, icon: "sun" });
        expect(fetchOpenMeteoForecastMock).toHaveBeenCalledWith(37.6, -1.13, expect.any(Function));

    });

    it("sin geolocalización disponible en el navegador, devuelve null sin llamar a Open-Meteo", async () => {

        vi.stubGlobal("navigator", {});

        const result = await getCurrentWeatherAtDeviceLocation();

        expect(result).toBeNull();
        expect(fetchOpenMeteoForecastMock).not.toHaveBeenCalled();

    });

    it("con el permiso denegado (o cualquier error de geolocalización), devuelve null sin llamar a Open-Meteo", async () => {

        vi.stubGlobal("navigator", {
            geolocation: {
                getCurrentPosition: (success, error) => error({ code: 1, message: "User denied Geolocation" })
            }
        });

        const result = await getCurrentWeatherAtDeviceLocation();

        expect(result).toBeNull();
        expect(fetchOpenMeteoForecastMock).not.toHaveBeenCalled();

    });

    it("con ubicación real pero Open-Meteo sin bloque current (o caído), devuelve null", async () => {

        vi.stubGlobal("navigator", {
            geolocation: {
                getCurrentPosition: (success) => success({ coords: { latitude: 37.6, longitude: -1.13 } })
            }
        });

        fetchOpenMeteoForecastMock.mockResolvedValue(null);

        const result = await getCurrentWeatherAtDeviceLocation();

        expect(result).toBeNull();

    });

    it("nunca lanza -- cualquier fallo inesperado también resuelve a null", async () => {

        vi.stubGlobal("navigator", {
            geolocation: {
                getCurrentPosition: () => { throw new Error("boom"); }
            }
        });

        await expect(getCurrentWeatherAtDeviceLocation()).resolves.toBeNull();

    });

});
