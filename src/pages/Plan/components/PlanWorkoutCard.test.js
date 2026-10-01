import { describe, it, expect, vi, afterEach } from "vitest";

let linkedWorkout = null;
let expandedSessionId = null;
let sessionMenuOpenId = null;

vi.mock("../../../data/workoutStore.js", () => ({
    getWorkoutForSession: () => linkedWorkout
}));

vi.mock("../planStore.js", () => ({
    getExpandedSessionId: () => expandedSessionId,
    getSessionMenuOpenId: () => sessionMenuOpenId
}));

const { PlanWorkoutCard, buildDescriptionSummary } = await import("./PlanWorkoutCard.js");

function workout(overrides = {}) {
    return {
        id: "w1",
        date: "2026-08-25",
        day: "MAR",
        type: "z2",
        title: null,
        subtitle: null,
        description: null,
        distanceKm: null,
        durationSec: null,
        targetPaceSecPerKm: null,
        targetHrZone: null,
        ...overrides
    };
}

describe("PlanWorkoutCard -- tarjeta compacta (fase 4 del pulido de Plan)", () => {

    afterEach(() => {
        linkedWorkout = null;
        expandedSessionId = null;
        sessionMenuOpenId = null;
    });

    it("sin sesión seleccionada, solo una línea de texto -- sin tarjeta vacía (pulido final)", () => {

        const html = PlanWorkoutCard(null);
        expect(html).toContain("plan-select-hint");
        expect(html).toContain("Selecciona una sesión de la semana");
        expect(html).not.toContain("plan-workout-card");

    });

    it("título real + subtítulo con solo el tipo (\"5 × 1000 m\" / \"Series\")", () => {

        const html = PlanWorkoutCard(workout({ type: "intervals", title: "5 × 1000 m", distanceKm: 10, targetPaceSecPerKm: 265 }));

        expect(html).toMatch(/class="workout-type-line">\s*Series\s*</);
        // los datos van en las cápsulas, no repetidos en el subtítulo
        expect(html.split("10 km").length - 1).toBe(1);
        expect(html.split("4:25/km").length - 1).toBe(1);

    });

    it("sin título real, el tipo hace de título y no se repite como subtítulo", () => {

        const html = PlanWorkoutCard(workout({ type: "strength" }));

        expect(html).toContain("Fuerza");
        expect(html).not.toContain("workout-type-line");
        expect(html).not.toContain("null");

    });

    it("completada: chip 'Completada', borde verde y badge en color de completado", () => {

        const html = PlanWorkoutCard(workout({ type: "intervals", status: "completed" }));

        expect(html).toContain("Completada");
        expect(html).toContain("plan-workout-card--completed");
        expect(html).toContain("day-color-completed");
        expect(html).not.toContain("day-color-series");

    });

    it("pendiente: sin chip, badge en el color de su categoría", () => {

        const html = PlanWorkoutCard(workout({ type: "intervals", status: "pending" }));

        expect(html).not.toContain("workout-status-chip");
        expect(html).toContain("day-color-series");

    });

    it("sin papelera suelta: el menú \"···\" sustituye al icono de borrar de siempre", () => {

        const html = PlanWorkoutCard(workout());

        expect(html).toContain("workout-menu-toggle");
        expect(html).not.toContain("workout-delete");

    });

    it("el popover del menú solo aparece cuando esta sesión tiene el menú abierto", () => {

        const closed = PlanWorkoutCard(workout());
        expect(closed).not.toContain("workout-menu-popover");

        sessionMenuOpenId = "w1";
        const open = PlanWorkoutCard(workout());

        expect(open).toContain("workout-menu-popover");
        expect(open).toContain("Editar sesión");
        expect(open).toContain("Duplicar");
        expect(open).toContain("Eliminar");
        expect(open).toContain('data-action="edit-planned-session"');
        expect(open).toContain('data-action="start-duplicate-session"');
        expect(open).toContain('data-action="delete-planned-session"');

    });

    it("con una descripción corta (sin recortar), no muestra el botón de expandir", () => {

        const html = PlanWorkoutCard(workout({ description: "Rodaje suave" }));

        expect(html).toContain("Rodaje suave");
        expect(html).not.toContain("workout-expand-toggle");

    });

    it("con una descripción larga de una sola frase, sigue ofreciendo 'Ver sesión completa' (el CSS puede recortarla)", () => {

        const long = "Calentamiento 10min + 6x400m a ritmo 5k con 90s recuperación + vuelta a la calma 10min trote suave, prestar atención a la técnica de carrera en cada repetición";
        const html = PlanWorkoutCard(workout({ description: long }));

        expect(html).toContain("workout-expand-toggle");
        expect(html).toContain("Ver sesión completa");

    });

    it("expandida (expandedSessionId coincide), muestra el párrafo completo real, nunca recortado", () => {

        const long = "Calentamiento 10min + 6x400m a ritmo 5k con 90s recuperación + vuelta a la calma 10min trote suave, prestar atención a la técnica de carrera en cada repetición";
        expandedSessionId = "w1";

        const html = PlanWorkoutCard(workout({ description: long }));

        expect(html).toContain("workout-description--expanded");
        expect(html).toContain(long);
        expect(html).toContain("Ver menos");

    });

    it("cápsulas de datos compactas (2x2) solo con los campos reales presentes", () => {

        const html = PlanWorkoutCard(workout({ distanceKm: 10, targetHrZone: "Z2" }));

        expect(html).toContain("workout-grid");
        expect(html).toContain('aria-label="Distancia"');
        expect(html).toContain('aria-label="Zona de FC"');
        expect(html).not.toContain('aria-label="Duración"');

    });

    it("con un entrenamiento real enlazado, el botón sólido dice 'VER ENTRENAMIENTO REGISTRADO'", () => {

        linkedWorkout = { id: "real1" };
        const html = PlanWorkoutCard(workout());

        expect(html).toContain("VER ENTRENAMIENTO REGISTRADO");
        expect(html).toContain('data-action="view-session-workout"');
        expect(html).not.toContain("Mover sesión");

    });

    it("sin entrenamiento real enlazado, muestra el botón ghost 'Mover sesión'", () => {

        const html = PlanWorkoutCard(workout());

        expect(html).toContain("Mover sesión");
        expect(html).toContain("workout-button--ghost");
        expect(html).not.toContain("VER ENTRENAMIENTO REGISTRADO");

    });

});

describe("buildDescriptionSummary -- resumen corto sin cortes a mitad de frase (pulido final)", () => {

    const pdf = [
        "Objetivo: mejorar el umbral con un estímulo de calidad bien controlado.",
        "Estructura: 15 min suaves + movilidad + 3 progresivos. Después, 5 × 1000 m a ritmo objetivo con 2 min de trote. 10 min suaves de vuelta a la calma.",
        "Intensidad: 4:25-4:30/km.",
        "Clave: la última serie igual que la primera."
    ].join("\n");

    it("en un plan por secciones usa 'Estructura', sin la etiqueta", () => {
        const { summary } = buildDescriptionSummary(pdf);
        expect(summary.startsWith("15 min suaves + movilidad + 3 progresivos.")).toBe(true);
        expect(summary).not.toContain("Estructura:");
        expect(summary).not.toContain("Objetivo");
    });

    it("solo frases enteras, nunca un corte con '…'", () => {
        const { summary, hasMore } = buildDescriptionSummary(pdf);
        expect(summary).toBe("15 min suaves + movilidad + 3 progresivos. Después, 5 × 1000 m a ritmo objetivo con 2 min de trote.");
        expect(summary).not.toContain("…");
        expect(hasMore).toBe(true);
    });

    it("sin secciones, usa la primera línea real", () => {
        const { summary, hasMore } = buildDescriptionSummary("Rodaje suave por el parque.\nSin reloj.");
        expect(summary).toBe("Rodaje suave por el parque.");
        expect(hasMore).toBe(true);
    });

    it("una descripción corta se ve entera y no ofrece 'ver más'", () => {
        expect(buildDescriptionSummary("Rodaje suave")).toEqual({ summary: "Rodaje suave", hasMore: false });
    });

});
