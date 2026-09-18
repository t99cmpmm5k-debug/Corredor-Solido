import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function jsonResponse(body, ok = true, status = 200) {
    return { ok, status, json: () => Promise.resolve(body) };
}

// vi.resetModules() + reimport en cada test -- reverseGeocode.js encola
// las llamadas con un margen mínimo de 1s entre sí (throttle real de
// Nominatim, ver el propio archivo) usando estado a nivel de módulo. Sin
// resetear ese estado entre tests, cada test de este archivo heredaría el
// hueco ya reservado por el anterior y se encadenarían esperas reales de 1s
// en 1s -- nada roto, pero cada test aquí llama a reverseGeocodeCity() una
// sola vez, así que con el módulo fresco cada vez esa única llamada
// siempre sale inmediata (nextAvailableAt arranca en 0).
describe("reverseGeocodeCity -- geocoding inverso real (Nominatim) para GPX/TCX", () => {

    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("con address.city presente, la devuelve", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ address: { city: "Murcia", state: "Región de Murcia", country: "España" } })));

        const { reverseGeocodeCity } = await import("./reverseGeocode.js");
        const city = await reverseGeocodeCity(37.98, -1.13);

        expect(city).toBe("Murcia");

    });

    it("orden de preferencia real: sin city, cae a town", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ address: { town: "Puerto Lumbreras", province: "Murcia" } })));

        const { reverseGeocodeCity } = await import("./reverseGeocode.js");
        const city = await reverseGeocodeCity(37.56, -1.81);

        expect(city).toBe("Puerto Lumbreras");

    });

    it("sin city ni town, cae a village", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ address: { village: "Ojós", county: "Río Alto" } })));

        const { reverseGeocodeCity } = await import("./reverseGeocode.js");
        const city = await reverseGeocodeCity(38.19, -1.35);

        expect(city).toBe("Ojós");

    });

    it("sin city/town/village, cae a municipality como último respaldo", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ address: { municipality: "Aledo" } })));

        const { reverseGeocodeCity } = await import("./reverseGeocode.js");
        const city = await reverseGeocodeCity(37.85, -1.58);

        expect(city).toBe("Aledo");

    });

    it("con city Y town a la vez, prefiere city (orden de preferencia)", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ address: { city: "Lorca", town: "Otro nombre" } })));

        const { reverseGeocodeCity } = await import("./reverseGeocode.js");
        const city = await reverseGeocodeCity(37.67, -1.7);

        expect(city).toBe("Lorca");

    });

    it("sin ninguno de los 4 campos reconocidos (solo barrio/calle/provincia/país), devuelve null -- nunca cae a un nivel más amplio", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ address: { suburb: "Barrio X", road: "Calle Y", state: "Murcia", country: "España" } })));

        const { reverseGeocodeCity } = await import("./reverseGeocode.js");
        const city = await reverseGeocodeCity(37.98, -1.13);

        expect(city).toBeNull();

    });

    it("sin bloque address en la respuesta, devuelve null", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({})));

        const { reverseGeocodeCity } = await import("./reverseGeocode.js");
        const city = await reverseGeocodeCity(37.98, -1.13);

        expect(city).toBeNull();

    });

    it("con HTTP no-ok, devuelve null sin lanzar", async () => {

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(null, false, 403)));

        const { reverseGeocodeCity } = await import("./reverseGeocode.js");

        await expect(reverseGeocodeCity(37.98, -1.13)).resolves.toBeNull();

    });

    it("sin red (fetch rechaza), devuelve null sin lanzar", async () => {

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        const { reverseGeocodeCity } = await import("./reverseGeocode.js");

        await expect(reverseGeocodeCity(37.98, -1.13)).resolves.toBeNull();

    });

    it("nunca intenta fijar un header User-Agent (fetch() del navegador lo ignoraría en silencio -- sería código muerto)", async () => {

        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ address: { city: "Murcia" } }));
        vi.stubGlobal("fetch", fetchMock);

        const { reverseGeocodeCity } = await import("./reverseGeocode.js");
        await reverseGeocodeCity(37.98, -1.13);

        const [, options] = fetchMock.mock.calls[0];
        expect(options?.headers?.["User-Agent"]).toBeUndefined();

    });

    it("dos llamadas seguidas en el mismo módulo se espacian al menos 1s (limite real de Nominatim) -- verificado con reloj falso, sin esperar de verdad", async () => {

        vi.useFakeTimers();

        const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ address: { city: "Murcia" } }));
        vi.stubGlobal("fetch", fetchMock);

        const { reverseGeocodeCity } = await import("./reverseGeocode.js");

        const first = reverseGeocodeCity(37.98, -1.13);
        await vi.advanceTimersByTimeAsync(0);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        const second = reverseGeocodeCity(37.98, -1.13);
        await vi.advanceTimersByTimeAsync(0);
        // Todavía no debería haber salido -- menos de 1s desde la primera.
        expect(fetchMock).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(1000);
        expect(fetchMock).toHaveBeenCalledTimes(2);

        await Promise.all([first, second]);
        vi.useRealTimers();

    });

});
