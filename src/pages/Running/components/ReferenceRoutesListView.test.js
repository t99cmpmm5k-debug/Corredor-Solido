import { describe, it, expect, vi, afterEach } from "vitest";

let routes = [];
let workouts = [];

vi.mock("../../../data/referenceRouteStore.js", () => ({
    getReferenceRoutes: () => routes,
    getReferenceRouteForWorkout: () => null
}));

vi.mock("../../../data/workoutStore.js", () => ({
    getWorkouts: () => workouts
}));

const { ReferenceRoutesListView } = await import("./ReferenceRoutesListView.js");

describe("ReferenceRoutesListView -- pantalla de lista + crear recorrido", () => {

    afterEach(() => {
        routes = [];
        workouts = [];
    });

    it("sin ningún recorrido, muestra el estado vacío en vez de una lista en blanco", () => {

        const html = ReferenceRoutesListView(false, null);

        expect(html).toContain("Todavía no has creado ningún recorrido de referencia.");
        expect(html).toContain('data-action="start-creating-route"');

    });

    it("formulario de creación cerrado por defecto: solo el botón 'Crear recorrido'", () => {

        const html = ReferenceRoutesListView(false, null);

        expect(html).toContain('data-action="start-creating-route"');
        expect(html).not.toContain('data-field="route-name"');

    });

    // Input SIN controlar a propósito (bug real: un <input> "controlado"
    // que llamaba a rerender() en cada tecla cerraba el teclado del móvil
    // en cada pulsación, porque rerender() reemplaza app.innerHTML entero
    // -- ver el comentario junto a CreateRouteForm() en
    // ReferenceRoutesListView.js). Por eso el componente ya no recibe ni
    // pinta el texto tecleado -- initRunningEvents.js lo lee del DOM al
    // guardar -- y el botón "Crear" nunca lleva `disabled` reactivo.
    it("formulario abierto: input sin valor forzado desde el store, botón Crear siempre pulsable (nunca disabled)", () => {

        const html = ReferenceRoutesListView(true, null);

        expect(html).toContain('data-field="route-name"');
        expect(html).not.toContain("value=");
        expect(html).not.toMatch(/data-action="save-new-route"[^>]*disabled/);

    });

    it("cada recorrido existente se pinta como una tarjeta tocable, con su recuento real de entrenos asignados", () => {

        routes = [
            { id: "r1", name: "8K referencia", workoutIds: ["w1", "w2"] },
            { id: "r2", name: "10K parque", workoutIds: [] }
        ];
        workouts = [{ id: "w1", date: "2026-08-01" }, { id: "w2", date: "2026-08-10" }, { id: "w3", date: "2026-08-15" }];

        const html = ReferenceRoutesListView(false, null);

        expect(html).toContain("8K referencia");
        expect(html).toContain("2 entrenos");
        expect(html).toContain("10K parque");
        expect(html).toContain("Sin entrenos asignados todavía");
        expect(html).toMatch(/data-action="open-reference-route-detail"[^>]*data-route-id="r1"/s);

    });

    it("el menú '···' de un recorrido solo se abre para el id activo (routeMenuOpenId)", () => {

        routes = [{ id: "r1", name: "8K referencia", workoutIds: [] }, { id: "r2", name: "10K parque", workoutIds: [] }];

        const html = ReferenceRoutesListView(false, "r1");

        expect(html).toContain("Eliminar recorrido");
        // Solo un popover abierto -- un único data-action="delete-route" en todo el HTML.
        expect((html.match(/data-action="delete-route"/g) || [])).toHaveLength(1);
        expect(html).toContain('data-route-id="r1"');

    });

});
