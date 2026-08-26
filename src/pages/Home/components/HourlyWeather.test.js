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

    // Bug real corregido en esta fase: a las 13:49 la franja "mejor para
    // correr" recomendaba "00:00-01:00" -- la hora más fría de las 24h
    // cacheadas, pero de la madrugada de MAÑANA, sin sentido como
    // recomendación de HOY.
    it("nunca recomienda una franja de la madrugada de mañana, aunque sea la más fría de toda la lista cacheada", () => {

        function h(time, temp, isNewDay = false) {
            return { time, temp, icon: "sun", isNewDay, windKmh: null, humidity: null };
        }

        const hours = [
            h("13:00", 30), h("14:00", 29), h("20:00", 22), h("21:00", 21),
            h("22:00", 20), h("23:00", 19), h("00:00", 15, true), h("01:00", 14)
        ];

        const now = new Date("2026-08-22T13:49:00");
        const html = HourlyWeather({ hours, current: null, label: null }, now);

        // El bloque destacado nunca propone la franja de mañana -- la
        // tira de 24h de abajo SÍ sigue mostrando esa hora a propósito
        // (ver comentario en BestRunningHour), así que la comprobación va
        // solo sobre el bloque de arriba, no sobre el HTML entero.
        const bestBlock = html.slice(
            html.indexOf('class="hourly-weather-best'),
            html.indexOf('class="hourly-weather-scroll')
        );

        expect(bestBlock).not.toContain("00:00-01:00");
        expect(bestBlock).not.toContain("14°");
        expect(bestBlock).toContain("23:00");

    });

    // Umbral de favorabilidad (ver isFavorableHour en hourlyForecast.js):
    // si incluso la menos mala del día sigue siendo poco favorable, el
    // mensaje cambia a uno más honesto -- pero sigue citando la hora y
    // temperatura reales, nunca inventadas.
    it("si ninguna franja de hoy es claramente favorable, usa el mensaje de fallback con la hora y temperatura reales", () => {

        function h(time, temp) {
            return { time, temp, icon: "sun", isNewDay: false, windKmh: null, humidity: null };
        }

        const hours = [h("14:00", 32), h("15:00", 31), h("20:00", 26), h("21:00", 25)];
        const now = new Date("2026-08-22T13:49:00");

        const html = HourlyWeather({ hours, current: null, label: null }, now);

        expect(html).toContain("Hoy no hay una franja especialmente favorable");
        expect(html).toContain("Mejor a partir de las");
        expect(html).toContain("21:00");
        expect(html).toContain("25°");
        expect(html).not.toContain("Mejor franja restante para correr");

    });

    it("con una franja de hoy claramente favorable, muestra el mensaje normal con el rango horario", () => {

        function h(time, temp) {
            return { time, temp, icon: "sun", isNewDay: false, windKmh: null, humidity: null };
        }

        const hours = [h("20:00", 26), h("21:00", 20), h("22:00", 24)];
        const now = new Date("2026-08-22T19:30:00");

        const html = HourlyWeather({ hours, current: null, label: null }, now);

        expect(html).toContain("Mejor franja restante para correr");
        expect(html).toContain("21:00-22:00");

    });

    // Bug real corregido en esta fase: con el reloj real ya DENTRO de la
    // mejor franja (23:08, franja "23:00-00:00"), el mensaje hablaba en
    // futuro ("mejor franja restante: 23:00-00:00") como si aún no
    // hubiera empezado.
    it("con el reloj real ya dentro de la mejor franja, dice 'ahora' en vez de un rango futuro", () => {

        function h(time, temp) {
            return { time, temp, icon: "sun", isNewDay: false, windKmh: null, humidity: null };
        }

        const hours = [h("21:00", 27), h("22:00", 25), h("23:00", 18)];
        const now = new Date("2026-08-22T23:08:00");

        const html = HourlyWeather({ hours, current: null, label: null }, now);

        expect(html).toContain("Ahora es una buena franja");
        expect(html).toContain("18°");
        expect(html).not.toContain("Mejor franja restante");
        expect(html).not.toContain("23:00-00:00");

    });

    it("con la mejor franja todavía sin empezar, mantiene el mensaje en futuro", () => {

        function h(time, temp) {
            return { time, temp, icon: "sun", isNewDay: false, windKmh: null, humidity: null };
        }

        const hours = [h("21:00", 27), h("22:00", 25), h("23:00", 18)];
        const now = new Date("2026-08-22T20:15:00");

        const html = HourlyWeather({ hours, current: null, label: null }, now);

        expect(html).toContain("Mejor franja restante para correr");
        expect(html).toContain("23:00-00:00");
        expect(html).not.toContain("Ahora es una buena franja");

    });

    // Ajustes finales de cierre (B4): ni siquiera la hora más fresca del
    // día se recomienda si cae de madrugada -- se elige la mejor opción
    // real dentro de 06:00-23:00.
    it("ignora la hora más fresca si cae de madrugada, y recomienda la mejor real dentro de 06:00-23:00", () => {

        function h(time, temp) {
            return { time, temp, icon: "sun", isNewDay: false, windKmh: null, humidity: null };
        }

        const hours = [h("04:00", 14), h("05:00", 15), h("06:00", 17), h("07:00", 19), h("20:00", 22)];
        const now = new Date("2026-08-22T03:30:00");

        const html = HourlyWeather({ hours, current: null, label: null }, now);

        const bestBlock = html.slice(
            html.indexOf('class="hourly-weather-best'),
            html.indexOf('class="hourly-weather-scroll')
        );

        expect(bestBlock).not.toContain("04:00");
        expect(bestBlock).not.toContain("05:00");
        expect(bestBlock).toContain("06:00-07:00");

    });

});
