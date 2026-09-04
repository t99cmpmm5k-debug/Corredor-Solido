import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Mismo helper que BottomNavigation.test.js (no compartido a propósito --
// ver ese archivo: cada test de CSS es autocontenido en este proyecto) --
// extrae solo el cuerpo de la regla del selector dado, no el archivo
// entero, para que un backdrop-filter en OTRA regla de Running.css no dé
// un falso positivo aquí.
function extractRuleBody(cssText, selector) {

    const escaped = selector.replace(/[.#]/g, "\\$&");
    const opening = new RegExp(`${escaped}\\s*\\{`);

    const match = opening.exec(cssText);
    if (!match) return null;

    const start = match.index + match[0].length;
    let depth = 1;
    let i = start;

    while (i < cssText.length && depth > 0) {
        if (cssText[i] === "{") depth++;
        else if (cssText[i] === "}") depth--;
        i++;
    }

    return cssText.slice(start, i - 1);

}

// Regresión (2026-09-04): la fila de chips de filtro (Todos/Rodaje Z2/
// Series/Tirada/Carrera) ya llevaba position:sticky desde la fase 2/6 de
// Running -- lo que faltaba era el acabado visual (fondo sólido con blur
// real, como el resto de barras fijas de la app) para que el texto de las
// tarjetas que pasan por debajo no se mezclara a simple vista.
describe("Running -- fila de chips de filtro (.type-filter-list) sticky con blur", () => {

    const css = readFileSync(resolve(here, "Running.css"), "utf8");
    const body = extractRuleBody(css, ".type-filter-list");

    it("se queda fija (sticky) al hacer scroll", () => {

        expect(body).not.toBeNull();
        expect(body).toMatch(/position\s*:\s*sticky/);

    });

    it("tiene fondo propio (no heredado) y blur real, no solo un color sólido a secas", () => {

        expect(body).toMatch(/background\s*:/);
        expect(body).toMatch(/backdrop-filter\s*:\s*blur\(/);
        expect(body).toMatch(/-webkit-backdrop-filter\s*:\s*blur\(/);

    });

});

// Regresión (2026-09-04, ronda 3): con top:calc(10px + safe-area) quedaba un
// hueco real entre el borde de la pantalla y los chips al fijarse -- se veía
// la tarjeta anterior asomando por ahí (confirmado en iPhone real). Solo un
// text-match de CSS no puede probar que el hueco desaparece de verdad (ver
// project_running_sticky_filter_body_overflow.md -- por eso el fix en sí se
// verificó con Playwright + WebKit real, no solo con este test), pero sí
// sirve de red mínima contra que alguien revierta por accidente cualquiera
// de las dos mitades del fix: top:0 (el fondo debe llegar al borde real) +
// el padding extra solo en .is-stuck (nunca en la regla base, o volvería el
// hueco permanente en la vista normal sin scroll -- probado y descartado).
describe("Running -- .type-filter-list sin hueco al fijarse (top:0 + padding solo en .is-stuck)", () => {

    const css = readFileSync(resolve(here, "Running.css"), "utf8");
    const baseBody = extractRuleBody(css, ".type-filter-list");
    const stuckBody = extractRuleBody(css, ".type-filter-list.is-stuck");

    it("el fondo llega al borde real de la pantalla (top:0, no un offset con hueco)", () => {

        expect(baseBody).toMatch(/top\s*:\s*0\s*;/);

    });

    it("la separación del notch/isla dinámica solo se aplica al estar realmente pegada (.is-stuck)", () => {

        expect(stuckBody).not.toBeNull();
        expect(stuckBody).toMatch(/padding-top\s*:.*safe-area-inset-top/);
        // La regla base NO debe llevar ese padding-top propio -- si lo
        // llevara siempre, sería el hueco permanente que ya se descartó.
        expect(baseBody).not.toMatch(/padding-top\s*:.*safe-area-inset-top/);

    });

});
