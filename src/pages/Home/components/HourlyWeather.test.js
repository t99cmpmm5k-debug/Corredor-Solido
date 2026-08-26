import { describe, it, expect } from "vitest";
import { HourlyWeather } from "./HourlyWeather.js";

function hour(time, temp, icon = "sun") {
    return { time, temp, icon, isNewDay: false, windKmh: null, humidity: null };
}

describe("HourlyWeather", () => {

    it("sin horas, no renderiza nada", () => {
        expect(HourlyWeather({ hours: [], current: null, label: null })).toBe("");
    });

    it("muestra la franja restante (rango HH:MM-HH:MM) de la hora recomendada, no una hora suelta", () => {

        const hours = [hour("20:00", 26), hour("21:00", 22), hour("22:00", 24)];
        const now = new Date("2026-08-22T19:30:00");

        const html = HourlyWeather({ hours, current: null, label: null }, now);

        expect(html).toContain("Mejor franja restante para correr");
        expect(html).toContain("21:00-22:00");

    });

    // Bug que esta fase corrige: el pronóstico se pide una sola vez por
    // sesión y se cachea (ver homeWeatherStore.js) -- si ha pasado un
    // rato desde entonces, la hora "ideal" original puede haber quedado
    // atrás. Nunca debe proponerse ya pasada respecto al reloj real de
    // ahora mismo.
    it("nunca propone como mejor franja una hora ya pasada respecto al reloj real actual, aunque sea la más fría de toda la lista cacheada", () => {

        const hours = [hour("08:00", 15), hour("09:00", 18), hour("20:00", 24), hour("21:00", 26)];
        const now = new Date("2026-08-22T19:45:00"); // 08:00 y 09:00 ya pasaron

        const html = HourlyWeather({ hours, current: null, label: null }, now);

        expect(html).not.toContain("08:00-09:00");
        expect(html).toContain("20:00-21:00");

    });

    it("si TODAS las horas restantes ya pasaron, omite la línea de mejor franja pero sigue mostrando la tira de 24h completa", () => {

        const hours = [hour("08:00", 15), hour("09:00", 16)];
        const now = new Date("2026-08-22T15:00:00");

        const html = HourlyWeather({ hours, current: null, label: null }, now);

        expect(html).not.toContain("Mejor franja restante");
        expect(html).toContain("08:00");
        expect(html).toContain("09:00");

    });

    it("con ubicación, la cabecera muestra 'Hoy · label'", () => {

        const hours = [hour("10:00", 20)];
        const html = HourlyWeather({ hours, current: null, label: "Ojós" }, new Date("2026-08-22T09:30:00"));

        expect(html).toContain("Hoy · Ojós");

    });

});
