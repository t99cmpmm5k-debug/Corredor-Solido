import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../../");

// Regresión del bug real: .bottom-nav es position:fixed (relativo al
// viewport) SOLO mientras ningún ancestro suyo declare transform, filter,
// backdrop-filter, will-change(transform/filter), contain(layout/paint/
// content/strict) o perspective -- cualquiera de esas propiedades en un
// ancestro convierte a la barra en position:absolute de facto respecto a
// ESE ancestro, y entonces "flota" en medio del contenido al hacer scroll
// en vez de quedarse anclada al viewport. Este test no sustituye probar
// en un dispositivo real (ver PARTE del pedido sobre iPhone/isla
// dinámica), pero blinda contra que alguien reintroduzca sin querer una
// de estas propiedades en el contenedor raíz de cualquiera de las 6
// pantallas -- justo el tipo de cambio (hero full-bleed, márgenes
// negativos) que motivó este bug.
const CONTAINING_BLOCK_PROPERTIES = [
    /(?<!text-)transform\s*:/,
    /(?<!backdrop-)filter\s*:/,
    /backdrop-filter\s*:/,
    /will-change\s*:/,
    /contain\s*:\s*(layout|paint|content|strict)/,
    /perspective\s*:/,
    /isolation\s*:/
];

// (archivo relativo a src/, selector raíz que envuelve a .bottom-nav en
// esa pantalla -- ver BottomNavigation() en cada page.js: siempre se
// llama como hermano de este contenedor, nunca anidada dentro de él)
const PAGE_ROOT_CONTAINERS = [
    ["pages/Home/Home.css", ".home"],
    ["pages/Plan/Plan.css", ".plan-page"],
    ["pages/Running/Running.css", ".running"],
    ["pages/Carreras/Carreras.css", ".carreras"],
    ["pages/Gym/Gym.css", ".gym-page"],
    ["pages/Profile/Profile.css", ".profile"],
    ["styles/app.css", "#app"],
    ["styles/app.css", "body"],
    ["styles/app.css", "html"]
];

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

describe("BottomNavigation -- .bottom-nav es position:fixed, siempre relativo al viewport", () => {

    it("declara position:fixed", () => {

        const css = readFileSync(resolve(src, "components/Navigation/BottomNavigation.css"), "utf8");
        const body = extractRuleBody(css, ".bottom-nav");

        expect(body).not.toBeNull();
        expect(body).toMatch(/position\s*:\s*fixed/);

    });

    it.each(PAGE_ROOT_CONTAINERS)(
        "%s (%s) no rompe el containing block de position:fixed",
        (relativePath, selector) => {

            const css = readFileSync(resolve(src, relativePath), "utf8");
            const body = extractRuleBody(css, selector);

            expect(body).not.toBeNull();

            CONTAINING_BLOCK_PROPERTIES.forEach(pattern => {
                expect(body).not.toMatch(pattern);
            });

        }
    );

});
