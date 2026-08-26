import { describe, it, expect, vi, afterEach } from "vitest";

// getWorkoutForSession() se sustituye por un stub -- SessionCard.js no
// debe decidir por sí mismo si algo está "completed" (eso es
// withDerivedFields()/getSessionStatus() en workoutStore.js, ya probado
// en su propio test), solo pintar según status y resolver el workout real
// para el link "Ver resumen".
let workoutForSession = null;
vi.mock("../../../data/workoutStore.js", () => ({
    getCurrentWeekSessions: () => [],
    getWorkoutForSession: () => workoutForSession
}));

const { SessionCard } = await import("./SessionCard.js");

function baseWorkout(overrides = {}) {
    return { id: "s1", title: "Rodaje Z2", status: "pending", ...overrides };
}

describe("SessionCard -- estado finalizada", () => {

    afterEach(() => {
        workoutForSession = null;
    });

    it("una sesión pendiente no lleva ni el badge ni el botón de resumen", () => {

        const html = SessionCard(baseWorkout({ status: "pending" }));

        expect(html).not.toContain("session-completed-badge");
        expect(html).not.toContain('data-action="view-completed-workout"');
        expect(html).toContain("Iniciar entrenamiento");

    });

    it("una sesión completada muestra el badge 'Finalizada' y el botón 'Ver resumen' con el id del workout real", () => {

        workoutForSession = { id: "real-workout-42" };

        const html = SessionCard(baseWorkout({ status: "completed" }));

        expect(html).toContain("session-completed-badge");
        expect(html).toContain("Finalizada");
        expect(html).toContain('data-action="view-completed-workout"');
        expect(html).toContain('data-workout-id="real-workout-42"');
        expect(html).not.toContain("Iniciar entrenamiento");

    });

    it("una sesión completada con description NO muestra el toggle 'Ver entrenamiento' -- el botón único es 'Ver resumen'", () => {

        workoutForSession = { id: "real-workout-42" };

        const html = SessionCard(baseWorkout({ status: "completed", description: "Series de 400m" }));

        expect(html).not.toContain('data-action="toggle-session-detail"');
        expect(html).toContain('data-action="view-completed-workout"');

    });

    it("cabecera 'RUNNING DE HOY' (no genérica) -- para distinguir de 'GIMNASIO DE HOY' cuando se apilan las dos", () => {

        const html = SessionCard(baseWorkout());
        expect(html).toContain("RUNNING DE HOY");

    });

});

describe("SessionCard -- resumen compacto (fase 2, coherencia 2026-08-26)", () => {

    afterEach(() => {
        workoutForSession = null;
    });

    it("km real + etiqueta de zona por tipo + duración real, en una sola línea", () => {

        const html = SessionCard(baseWorkout({ type: "z2", distanceKm: 8, durationSec: 2760 }));
        expect(html).toContain("8 km · Zona 2 · ~46 min");

    });

    it("sin duración real pero con ritmo objetivo, la estima de distancia × ritmo -- no la inventa de la nada", () => {

        // 8 km a 5:45/km (345 s/km) = 2760 s = 46 min
        const html = SessionCard(baseWorkout({ type: "z2", distanceKm: 8, targetPaceSecPerKm: 345 }));
        expect(html).toContain("8 km · Zona 2 · ~46 min");

    });

    it("sin duración real ni ritmo objetivo, omite el segmento de duración en vez de inventarlo", () => {

        const html = SessionCard(baseWorkout({ type: "z2", distanceKm: 8 }));
        expect(html).toContain("8 km · Zona 2");
        expect(html).not.toMatch(/~\d+ min/);

    });

    it("sin distancia (p. ej. un tipo sin km, sesión libre), no antepone un km inventado", () => {

        const html = SessionCard(baseWorkout({ type: "recovery", distanceKm: null }));
        expect(html).toContain("Recuperación");
        expect(html).not.toMatch(/^\d+ km/);

    });

});
