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

});
