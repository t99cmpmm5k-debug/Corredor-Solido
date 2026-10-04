// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const geocodeMock = vi.fn();

vi.mock("./weatherEstimate.js", () => ({
    geocodeLocation: (...args) => geocodeMock(...args)
}));

const {
    resolveLiveWeatherLocation, requestLiveWeatherDeviceLocation, readFreshDevicePosition,
    isGeolocationDenied, forgetDevicePosition, POSITION_TTL_MS
} = await import("./weatherLocation.js");

const POSITION_KEY = "corredor-solido-device-position";
const DENIED_KEY = "corredor-solido-geolocation-denied";

function stubGeolocation(impl) {

    const getCurrentPosition = vi.fn(impl);
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
    return getCurrentPosition;

}

const grant = success => success({ coords: { latitude: 37.6, longitude: -1.13 } });
const deny = (success, error) => error({ code: 1, message: "User denied Geolocation" });

describe("weatherLocation -- cuántas veces se llega a pedir el GPS", () => {

    beforeEach(() => {
        localStorage.clear();
        geocodeMock.mockReset();
    });

    afterEach(() => vi.unstubAllGlobals());

    it("sin nada guardado ni localidad, pide el GPS una vez y guarda la posición", async () => {

        const gps = stubGeolocation(grant);

        expect(await resolveLiveWeatherLocation(null)).toEqual({ lat: 37.6, lon: -1.13, source: "gps" });
        expect(gps).toHaveBeenCalledTimes(1);
        expect(readFreshDevicePosition()).toEqual({ lat: 37.6, lon: -1.13 });

    });

    it("con posición guardada de hace menos de 12 h, la reutiliza SIN pedir el GPS (la siguiente apertura no avisa)", async () => {

        localStorage.setItem(POSITION_KEY, JSON.stringify({ lat: 1, lon: 2, savedAt: Date.now() - 11 * 60 * 60 * 1000 }));
        const gps = stubGeolocation(grant);

        expect(await resolveLiveWeatherLocation("Murcia")).toEqual({ lat: 1, lon: 2, source: "gps" });
        expect(gps).not.toHaveBeenCalled();
        expect(geocodeMock).not.toHaveBeenCalled();

    });

    it("con posición caducada y localidad en Perfil, usa la localidad y NO pide el GPS", async () => {

        localStorage.setItem(POSITION_KEY, JSON.stringify({ lat: 1, lon: 2, savedAt: Date.now() - POSITION_TTL_MS - 1000 }));
        geocodeMock.mockResolvedValue({ lat: 37.98, lon: -1.13 });
        const gps = stubGeolocation(grant);

        expect(await resolveLiveWeatherLocation("Murcia")).toEqual({ lat: 37.98, lon: -1.13, source: "localidad" });
        expect(gps).not.toHaveBeenCalled();

    });

    it("si el geocoding de la localidad no encuentra nada, cae al GPS", async () => {

        geocodeMock.mockResolvedValue(null);
        const gps = stubGeolocation(grant);

        expect((await resolveLiveWeatherLocation("Xyzzy")).source).toBe("gps");
        expect(gps).toHaveBeenCalledTimes(1);

    });

    it("una negativa se recuerda: la siguiente apertura no vuelve a pedir el GPS y no inventa ubicación", async () => {

        const gps = stubGeolocation(deny);

        expect(await resolveLiveWeatherLocation(null)).toBeNull();
        expect(isGeolocationDenied()).toBe(true);

        expect(await resolveLiveWeatherLocation(null)).toBeNull();
        expect(gps).toHaveBeenCalledTimes(1);

    });

    it("con negativa recordada pero localidad, el clima sale de la localidad", async () => {

        localStorage.setItem(DENIED_KEY, JSON.stringify({ deniedAt: Date.now() }));
        geocodeMock.mockResolvedValue({ lat: 37.98, lon: -1.13 });
        const gps = stubGeolocation(grant);

        expect((await resolveLiveWeatherLocation("Murcia")).source).toBe("localidad");
        expect(gps).not.toHaveBeenCalled();

    });

    it("un timeout (no es decisión del usuario) no se recuerda como negativa", async () => {

        stubGeolocation((success, error) => error({ code: 3, message: "Timeout" }));

        expect(await resolveLiveWeatherLocation(null)).toBeNull();
        expect(isGeolocationDenied()).toBe(false);

    });

    it("la acción manual pide el GPS aunque haya negativa recordada, y si sale bien la olvida", async () => {

        localStorage.setItem(DENIED_KEY, JSON.stringify({ deniedAt: Date.now() }));
        const gps = stubGeolocation(grant);

        expect(await requestLiveWeatherDeviceLocation()).toEqual({ lat: 37.6, lon: -1.13, source: "gps" });
        expect(gps).toHaveBeenCalledTimes(1);
        expect(isGeolocationDenied()).toBe(false);

    });

    it("sin geolocalización en el navegador ni localidad, devuelve null", async () => {

        vi.stubGlobal("navigator", {});

        expect(await resolveLiveWeatherLocation(null)).toBeNull();

    });

    it("forgetDevicePosition descarta la posición guardada", () => {

        localStorage.setItem(POSITION_KEY, JSON.stringify({ lat: 1, lon: 2, savedAt: Date.now() }));
        forgetDevicePosition();

        expect(readFreshDevicePosition()).toBeNull();

    });

});
