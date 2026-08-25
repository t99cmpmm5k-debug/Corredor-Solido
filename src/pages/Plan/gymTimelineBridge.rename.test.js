import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Reproducción del bug real (2026-08-25): renombrar el nombre general de
// una rutina (el que se ve en la lista de Gimnasio) hacía que esa rutina
// desapareciera de la línea temporal de Plan. La causa NO era ningún
// emparejamiento por texto -- gymTimelineBridge.js ya usaba day.weekday --
// sino que openBuilder() (gymRoutineBuilderStore.js) copiaba los días a
// mano listando solo `id`/`title`/`exercises`, así que day.weekday (el
// único vínculo real con Plan) se perdía en cuanto se guardaba la rutina
// desde ese formulario, aunque lo único que se editara fuera el nombre.
// Este test ejercita el flujo real de principio a fin (store de rutinas +
// constructor + puente con Plan, sin mocks) para que una regresión futura
// en cualquiera de los tres no pase desapercibida.
function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

const MONDAY = "2026-08-24"; // lunes

describe("Gimnasio↔Plan sobrevive a renombrar una rutina (bug real 2026-08-25)", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("renombrar el nombre general de la rutina no le hace perder su día programado en Plan", async () => {

        const { hydrate, createRoutine, updateRoutine } = await import("../../data/gymRoutineStore.js");
        const { openBuilder, setRoutineName, getBuilderState } = await import("../Gym/gymRoutineBuilderStore.js");
        const { getGymDayForDate } = await import("./gymTimelineBridge.js");

        await hydrate();

        const routine = await createRoutine({
            name: "Fuerza",
            days: [{ id: "d1", weekday: "lunes", title: "Torso", exercises: [] }],
            progressionNote: ""
        });

        // Antes de renombrar: aparece en Plan el lunes.
        expect(getGymDayForDate(MONDAY)?.day.id).toBe("d1");
        expect(getGymDayForDate(MONDAY)?.routine.name).toBe("Fuerza");

        // Editar SOLO el nombre general -- mismo flujo real que "Editar
        // rutina" en Gimnasio: abrir el constructor, cambiar el nombre,
        // guardar. El título del día interno y el resto no se tocan.
        openBuilder(routine);
        setRoutineName("Fuerza de Tren Superior");

        const state = getBuilderState();
        updateRoutine(state.routineId, { name: state.name, days: state.days, progressionNote: state.progressionNote });

        // Sigue apareciendo en Plan el lunes, con el nombre nuevo -- el
        // vínculo (day.weekday) no dependía nunca del texto y no debe
        // perderse por haber pasado por el formulario de edición.
        const match = getGymDayForDate(MONDAY);
        expect(match?.day.id).toBe("d1");
        expect(match?.routine.name).toBe("Fuerza de Tren Superior");

    });

    it("renombrar también el título del día interno no rompe el vínculo con Plan", async () => {

        const { hydrate, createRoutine, updateRoutine } = await import("../../data/gymRoutineStore.js");
        const { openBuilder, setRoutineName, setDayTitle, getBuilderState } = await import("../Gym/gymRoutineBuilderStore.js");
        const { getGymDayForDate } = await import("./gymTimelineBridge.js");

        await hydrate();

        const routine = await createRoutine({
            name: "Fuerza",
            days: [{ id: "d1", weekday: "lunes", title: "Torso", exercises: [] }],
            progressionNote: ""
        });

        openBuilder(routine);
        setRoutineName("Fuerza de Tren Superior");
        setDayTitle("d1", "Empuje");

        const state = getBuilderState();
        updateRoutine(state.routineId, { name: state.name, days: state.days, progressionNote: state.progressionNote });

        const match = getGymDayForDate(MONDAY);
        expect(match?.day.id).toBe("d1");
        expect(match?.day.title).toBe("Empuje");
        expect(match?.routine.name).toBe("Fuerza de Tren Superior");

    });

});
