// @vitest-environment happy-dom
// BottomNavigation.js importa RunningHeader.js -> themeManager.js, que
// toca localStorage al cargar el módulo -- solo existe en un entorno DOM.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { BottomNavigation } from "./BottomNavigation.js";

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

// Regresión del segundo bug real: el hueco deliberado entre la píldora y
// el borde físico (bottom:20px+safe-area, ver comentario junto a
// .bottom-nav-safe-area) dejaba pasar contenido de la propia página si su
// padding-bottom no reservaba sitio de sobra -- se veía "colarse" texto
// de las tarjetas por debajo de la barra en vez de quedar oculto.
describe("BottomNavigation -- franja de seguridad cubre el hueco hasta el borde físico", () => {

    it("BottomNavigation() renderiza la franja de seguridad junto a la píldora", () => {

        const html = BottomNavigation();

        expect(html).toContain('class="bottom-nav-safe-area"');
        expect(html).toContain('class="bottom-nav"');

    });

    it("la franja es fixed, a todo el ancho real de la pantalla, con fondo sólido (no translúcido) y por debajo del z-index de la píldora", () => {

        const css = readFileSync(resolve(src, "components/Navigation/BottomNavigation.css"), "utf8");
        const body = extractRuleBody(css, ".bottom-nav-safe-area");

        expect(body).not.toBeNull();
        expect(body).toMatch(/position\s*:\s*fixed/);
        expect(body).toMatch(/left\s*:\s*0/);
        expect(body).toMatch(/right\s*:\s*0/);
        expect(body).toMatch(/bottom\s*:\s*0/);

        // Fondo sólido: la propia variable de tema, sin color-mix hacia
        // transparent (a diferencia de la píldora, que sí es translúcida
        // a propósito) -- si esto fuera translúcido, dejaría de cumplir
        // su único propósito (que nada se vea por debajo).
        expect(body).toMatch(/background\s*:\s*var\(--navigation-background\)/);
        expect(body).not.toMatch(/transparent/);

        const navBody = extractRuleBody(css, ".bottom-nav");
        const stripZIndex = Number(body.match(/z-index\s*:\s*(-?\d+)/)?.[1]);
        const pillZIndex = Number(navBody.match(/z-index\s*:\s*(-?\d+)/)?.[1]);

        expect(Number.isNaN(stripZIndex)).toBe(false);
        expect(Number.isNaN(pillZIndex)).toBe(false);
        expect(stripZIndex).toBeLessThan(pillZIndex);
        expect(stripZIndex).toBeGreaterThan(0);

    });

    it("cubre exactamente el hueco de la píldora (mismo alto que su separación del borde), sin tapar su propio cristal/blur", () => {

        const css = readFileSync(resolve(src, "components/Navigation/BottomNavigation.css"), "utf8");
        const stripBody = extractRuleBody(css, ".bottom-nav-safe-area");
        const navBody = extractRuleBody(css, ".bottom-nav");

        const stripHeight = stripBody.match(/height\s*:\s*([^;]+);/)?.[1].trim();
        const pillBottomOffset = navBody.match(/bottom\s*:\s*([^;]+);/)?.[1].trim();

        expect(stripHeight).toBe(pillBottomOffset);

    });

});
