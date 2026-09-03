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
