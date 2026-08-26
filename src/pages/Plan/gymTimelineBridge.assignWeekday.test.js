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

const SUNDAY = "2026-08-30"; // domingo -- fuera del patrón automático (lunes/miércoles/viernes) a propósito, ver más abajo

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

        // Los 3 huecos del patrón automático (lunes/miércoles/viernes, ver
        // gymRoutineStore.js) ya ocupados a propósito -- así la rutina de
        // este test se crea SIN ningún weekday (ni manual ni automático),
        // que es justo la premisa que hace falta reproducir aquí: la
        // asignación viene solo del selector manual, no de una coincidencia
        // con el patrón por defecto. El día que se asigna a mano más abajo
        // (domingo) es deliberadamente uno FUERA de este patrón, para que
        // estas 3 rutinas de relleno no interfieran con la comprobación.
        await createRoutine({ name: "Ocupa lunes", days: [{ id: "occ-1", title: "X", weekday: "lunes", exercises: [] }], progressionNote: "" });
        await createRoutine({ name: "Ocupa miércoles", days: [{ id: "occ-2", title: "X", weekday: "miercoles", exercises: [] }], progressionNote: "" });
        await createRoutine({ name: "Ocupa viernes", days: [{ id: "occ-3", title: "X", weekday: "viernes", exercises: [] }], progressionNote: "" });

        // Mismo patrón exacto que el seed por defecto real (id "day1", sin
        // weekday) -- no un dato sintético inventado a mano.
        const routine = await createRoutine({
            name: "Torso Completo",
            days: [{ id: "day1", title: "Torso Completo", exercises: [] }],
            progressionNote: ""
        });

        // Antes de asignar weekday: ni Plan ni "Próximos entrenamientos"
        // (misma función) encuentran nada para el domingo.
        expect(getGymDayForDate(SUNDAY)).toBeNull();
        expect(getTodayGymDay(routine.days, SUNDAY)).toBeNull();

        // Editar la rutina y asignar el día desde el selector nuevo.
        openBuilder(routine);
        setDayWeekday("day1", "domingo");

        const state = getBuilderState();
        updateRoutine(state.routineId, { name: state.name, days: state.days, progressionNote: state.progressionNote });

        // Ahora sí aparece -- mismo id de día, misma rutina, con weekday.
        const match = getGymDayForDate(SUNDAY);
        expect(match?.day.id).toBe("day1");
        expect(match?.routine.name).toBe("Torso Completo");

    });

    it("mover una rutina ya programada a otro día (edición, no borrar+recrear) actualiza Plan/Gimnasio -- deja de verse en el día viejo y pasa a verse en el nuevo", async () => {

        const { hydrate, createRoutine, updateRoutine } = await import("../../data/gymRoutineStore.js");
        const { openBuilder, setDayWeekday, getBuilderState } = await import("../Gym/gymRoutineBuilderStore.js");
        const { getGymDayForDate } = await import("./gymTimelineBridge.js");

        await hydrate();

        // Ya programada un lunes -- como si el usuario la hubiera creado
        // (o el patrón automático se la hubiera asignado) hace tiempo.
        const routine = await createRoutine({
            name: "Pierna Funcional",
            days: [{ id: "day2", title: "Pierna Funcional", weekday: "lunes", exercises: [] }],
            progressionNote: ""
        });

        expect(getGymDayForDate("2026-08-24")?.day.id).toBe("day2"); // lunes

        // Moverla al viernes -- mismo flujo de "editar", no borrar y crear
        // otra rutina nueva.
        openBuilder(routine);
        setDayWeekday("day2", "viernes");

        const state = getBuilderState();
        updateRoutine(state.routineId, { name: state.name, days: state.days, progressionNote: state.progressionNote });

        // Ya no aparece el lunes...
        expect(getGymDayForDate("2026-08-24")).toBeNull();
        // ...aparece el viernes.
        expect(getGymDayForDate("2026-08-28")?.day.id).toBe("day2");

    });

});
