import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Bug real reportado por el usuario 2026-08-26: sus 3 rutinas reales
// (creadas por el seed por defecto de db.js, sin weekday -- ver
// seedDefaultGymRoutinesIfNeeded()) nunca aparecían ni en "Próximos
// entrenamientos" (Gimnasio) ni en la línea temporal de Plan. No era una
// regresión de código -- gymTimelineBridge.js y "Próximos entrenamientos"
// usan la misma función (getTodayGymDay(), ver gymSchedule.js) y estaban
// de acuerdo en que ninguna rutina tenía weekday -- sino que el
// constructor manual de rutinas nunca tuvo ninguna forma de asignarlo.
// Este test reproduce exactamente ese escenario de principio a fin (sin
// mocks) y confirma que, tras usar el nuevo selector de día de la semana
// del constructor, la rutina sí aparece.
function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

const WEDNESDAY = "2026-08-26"; // miércoles

describe("Asignar día de la semana desde el constructor conecta una rutina con Plan/Gimnasio", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("una rutina creada SIN weekday no aparece en Plan; tras asignarlo desde el constructor, sí", async () => {

        const { hydrate, createRoutine, updateRoutine } = await import("../../data/gymRoutineStore.js");
        const { openBuilder, setDayWeekday, getBuilderState } = await import("../Gym/gymRoutineBuilderStore.js");
        const { getGymDayForDate } = await import("./gymTimelineBridge.js");
        const { getTodayGymDay } = await import("../Gym/gymSchedule.js");

        await hydrate();

        // Mismo patrón exacto que el seed por defecto real (id "day1", sin
        // weekday) -- no un dato sintético inventado a mano.
        const routine = await createRoutine({
            name: "Torso Completo",
            days: [{ id: "day1", title: "Torso Completo", exercises: [] }],
            progressionNote: ""
        });

        // Antes de asignar weekday: ni Plan ni "Próximos entrenamientos"
        // (misma función) encuentran nada para hoy.
        expect(getGymDayForDate(WEDNESDAY)).toBeNull();
        expect(getTodayGymDay(routine.days, WEDNESDAY)).toBeNull();

        // Editar la rutina y asignar el día desde el selector nuevo.
        openBuilder(routine);
        setDayWeekday("day1", "miercoles");

        const state = getBuilderState();
        updateRoutine(state.routineId, { name: state.name, days: state.days, progressionNote: state.progressionNote });

        // Ahora sí aparece -- mismo id de día, misma rutina, con weekday.
        const match = getGymDayForDate(WEDNESDAY);
        expect(match?.day.id).toBe("day1");
        expect(match?.routine.name).toBe("Torso Completo");

    });

});
