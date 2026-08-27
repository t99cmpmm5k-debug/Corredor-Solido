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

const { PlanWorkoutCard } = await import("./PlanWorkoutCard.js");

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

    it("sin sesión seleccionada, muestra el estado vacío", () => {

        const html = PlanWorkoutCard(null);
        expect(html).toContain("plan-workout-card--empty");

    });

    it("línea de resumen compacta con datos reales (distancia · tipo · duración)", () => {

        const html = PlanWorkoutCard(workout({ distanceKm: 8, durationSec: 2100 }));

        expect(html).toContain("workout-summary-line");
        expect(html).toContain("8 km · Rodaje (Z2) · 35:00");

    });

    it("sin distancia/duración real, el resumen solo trae el tipo -- nunca un dato inventado", () => {

        const html = PlanWorkoutCard(workout({ type: "strength" }));

        expect(html).toContain("Fuerza");
        expect(html).not.toContain("null");

    });

    it("con un título real, el resumen NO lo repite (ya está en el <h2> de arriba) -- retoque de cierre", () => {

        const html = PlanWorkoutCard(workout({ type: "intervals", title: "4 x 1000m" }));

        const occurrences = html.split("4 x 1000m").length - 1;
        expect(occurrences).toBe(1);
        expect(html).toContain("Series");

    });

    it("con ritmo objetivo real, el resumen lo muestra como dato nuevo en vez de repetir el título", () => {

        const html = PlanWorkoutCard(workout({ type: "intervals", title: "4 x 1000m", targetPaceSecPerKm: 265 }));

        expect(html).toContain("Ritmo objetivo 4:25/km");

    });

    it("sin ritmo objetivo pero con zona de FC real, usa la zona de FC en su lugar", () => {

        const html = PlanWorkoutCard(workout({ type: "intervals", title: "4 x 1000m", targetHrZone: "Z4" }));

        expect(html).toContain("Zona de FC Z4");
        expect(html).not.toContain("Ritmo objetivo");

    });

    it("sin ritmo objetivo ni zona de FC, no inventa ningún rango -- el resumen se queda solo con el tipo", () => {

        const html = PlanWorkoutCard(workout({ type: "intervals", title: "4 x 1000m" }));

        expect(html).toContain("workout-summary-line");
        expect(html).not.toContain("Ritmo objetivo");
        expect(html).not.toContain("Zona de FC");

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

    it("con una descripción larga, colapsada muestra solo un extracto + botón para expandir", () => {

        const long = "Calentamiento 10min + 6x400m a ritmo 5k con 90s recuperación + vuelta a la calma 10min trote suave, prestar atención a la técnica de carrera en cada repetición";
        const html = PlanWorkoutCard(workout({ description: long }));

        expect(html).toContain("workout-expand-toggle");
        expect(html).toContain("Ver sesión completa");
        expect(html).not.toContain(long);

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
        expect(html).not.toContain("MOVER SESIÓN");

    });

    it("sin entrenamiento real enlazado, muestra el botón ghost 'MOVER SESIÓN'", () => {

        const html = PlanWorkoutCard(workout());

        expect(html).toContain("MOVER SESIÓN");
        expect(html).toContain("workout-button--ghost");
        expect(html).not.toContain("VER ENTRENAMIENTO REGISTRADO");

    });

});
