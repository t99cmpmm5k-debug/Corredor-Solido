import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

function resetFakeIndexedDB() {
    globalThis.indexedDB = new IDBFactory();
}

// Toda instalación fresca hidrata con las 3 rutinas por defecto ya
// sembradas (ver migración en db.test.js) -- estos tests comprueban el
// CRUD por encima de esa base real, no en un vacío artificial.
const DEFAULT_ROUTINE_COUNT = 3;

describe("gymRoutineStore — CRUD real (crear/editar/borrar), ya no un único puntero de rutina activa", () => {

    beforeEach(() => {
        resetFakeIndexedDB();
        vi.resetModules();
    });

    it("crea una rutina y queda disponible en getRoutines(), junto a las 3 por defecto", async () => {

        const { hydrate, createRoutine, getRoutines } = await import("./gymRoutineStore.js");
        await hydrate();

        const routine = await createRoutine({
            name: "Torso Completo",
            days: [{ id: "d1", title: "Lunes", exercises: [{ id: "e1", name: "Press", sets: 3, targetReps: "8", targetWeight: 40, weightUnit: "kg" }] }],
            progressionNote: "Sube 2.5kg si completas todo"
        });

        expect(getRoutines()).toHaveLength(DEFAULT_ROUTINE_COUNT + 1);
        expect(getRoutines().find(r => r.id === routine.id)).toMatchObject({ name: "Torso Completo" });

    });

    it("una rutina creada sobrevive a una re-hidratación (persiste de verdad en IndexedDB)", async () => {

        const { hydrate, createRoutine } = await import("./gymRoutineStore.js");
        await hydrate();
        await createRoutine({ name: "Pierna", days: [], progressionNote: "" });

        vi.resetModules();

        const { hydrate: hydrateAgain, getRoutines } = await import("./gymRoutineStore.js");
        await hydrateAgain();

        expect(getRoutines()).toHaveLength(DEFAULT_ROUTINE_COUNT + 1);
        expect(getRoutines().some(r => r.name === "Pierna")).toBe(true);

    });

    it("edita una rutina existente (nombre, días, nota) y actualiza su fecha de modificación", async () => {

        const { hydrate, createRoutine, updateRoutine, getRoutineById } = await import("./gymRoutineStore.js");
        await hydrate();

        const routine = await createRoutine({ name: "Original", days: [], progressionNote: "" });
        const originalUpdatedAt = routine.updatedAt;

        await new Promise(r => setTimeout(r, 2));

        updateRoutine(routine.id, {
            name: "Renombrada",
            days: [{ id: "d1", title: "Día único", exercises: [] }],
            progressionNote: "Nueva nota"
        });

        const updated = getRoutineById(routine.id);
        expect(updated.name).toBe("Renombrada");
        expect(updated.days).toHaveLength(1);
        expect(updated.progressionNote).toBe("Nueva nota");
        expect(updated.updatedAt).not.toBe(originalUpdatedAt);

    });

    it("editar una rutina no toca las demás (incluidas las 3 por defecto)", async () => {

        const { hydrate, createRoutine, updateRoutine, getRoutines } = await import("./gymRoutineStore.js");
        await hydrate();

        const before = getRoutines().map(r => ({ id: r.id, name: r.name }));

        const routine = await createRoutine({ name: "Original", days: [], progressionNote: "" });
        updateRoutine(routine.id, { name: "Renombrada", days: [], progressionNote: "" });

        const others = getRoutines().filter(r => r.id !== routine.id).map(r => ({ id: r.id, name: r.name }));
        expect(others).toEqual(before);

    });

    it("borra una rutina de verdad -- desaparece de la lista y no vuelve tras re-hidratar, sin tocar las demás", async () => {

        const { hydrate, createRoutine, deleteRoutine, getRoutines } = await import("./gymRoutineStore.js");
        await hydrate();

        const routine = await createRoutine({ name: "A borrar", days: [], progressionNote: "" });
        expect(getRoutines()).toHaveLength(DEFAULT_ROUTINE_COUNT + 1);

        deleteRoutine(routine.id);
        expect(getRoutines()).toHaveLength(DEFAULT_ROUTINE_COUNT);
        expect(getRoutines().some(r => r.id === routine.id)).toBe(false);

        vi.resetModules();
        const { hydrate: hydrateAgain, getRoutines: getRoutinesAgain } = await import("./gymRoutineStore.js");
        await hydrateAgain();

        expect(getRoutinesAgain()).toHaveLength(DEFAULT_ROUTINE_COUNT);

    });

    it("borrar una de las 3 rutinas por defecto la quita de verdad y no vuelve tras re-hidratar", async () => {

        const { hydrate, getRoutines, deleteRoutine } = await import("./gymRoutineStore.js");
        await hydrate();

        const [defaultRoutine] = getRoutines();
        deleteRoutine(defaultRoutine.id);

        expect(getRoutines()).toHaveLength(DEFAULT_ROUTINE_COUNT - 1);

        vi.resetModules();
        const { hydrate: hydrateAgain, getRoutines: getRoutinesAgain } = await import("./gymRoutineStore.js");
        await hydrateAgain();

        expect(getRoutinesAgain()).toHaveLength(DEFAULT_ROUTINE_COUNT - 1);
        expect(getRoutinesAgain().some(r => r.id === defaultRoutine.id)).toBe(false);

    });

    it("una rutina nueva sin día asignado a mano recibe automáticamente 'lunes' (primer hueco del patrón lunes/miércoles/viernes)", async () => {

        const { hydrate, createRoutine } = await import("./gymRoutineStore.js");
        await hydrate();

        const routine = await createRoutine({
            name: "Torso Completo",
            days: [{ id: "d1", title: "Torso", exercises: [] }],
            progressionNote: ""
        });

        expect(routine.days[0].weekday).toBe("lunes");

    });

    it("la 2ª y 3ª rutina nueva sin día reciben miércoles y viernes, en ese orden", async () => {

        const { hydrate, createRoutine } = await import("./gymRoutineStore.js");
        await hydrate();

        const first = await createRoutine({ name: "A", days: [{ id: "d1", title: "A", exercises: [] }], progressionNote: "" });
        const second = await createRoutine({ name: "B", days: [{ id: "d2", title: "B", exercises: [] }], progressionNote: "" });
        const third = await createRoutine({ name: "C", days: [{ id: "d3", title: "C", exercises: [] }], progressionNote: "" });

        expect(first.days[0].weekday).toBe("lunes");
        expect(second.days[0].weekday).toBe("miercoles");
        expect(third.days[0].weekday).toBe("viernes");

    });

    it("una 4ª rutina nueva sin día se queda sin asignar -- el patrón no tiene un cuarto día que inventar", async () => {

        const { hydrate, createRoutine } = await import("./gymRoutineStore.js");
        await hydrate();

        await createRoutine({ name: "A", days: [{ id: "d1", title: "A", exercises: [] }], progressionNote: "" });
        await createRoutine({ name: "B", days: [{ id: "d2", title: "B", exercises: [] }], progressionNote: "" });
        await createRoutine({ name: "C", days: [{ id: "d3", title: "C", exercises: [] }], progressionNote: "" });
        const fourth = await createRoutine({ name: "D", days: [{ id: "d4", title: "D", exercises: [] }], progressionNote: "" });

        expect(fourth.days[0].weekday).toBeFalsy();

    });

    it("el patrón salta un día ya ocupado por otra rutina, aunque esa rutina lo haya elegido a mano", async () => {

        const { hydrate, createRoutine } = await import("./gymRoutineStore.js");
        await hydrate();

        // El usuario ya eligió "miercoles" a mano para esta -- el patrón
        // automático de las siguientes debe saber que ese hueco ya no
        // está libre.
        await createRoutine({ name: "Manual", days: [{ id: "d1", title: "Manual", weekday: "miercoles", exercises: [] }], progressionNote: "" });

        const first = await createRoutine({ name: "A", days: [{ id: "d2", title: "A", exercises: [] }], progressionNote: "" });
        const second = await createRoutine({ name: "B", days: [{ id: "d3", title: "B", exercises: [] }], progressionNote: "" });

        expect(first.days[0].weekday).toBe("lunes");
        expect(second.days[0].weekday).toBe("viernes"); // salta miércoles, ya ocupado

    });

    it("una rutina nueva con día elegido a mano no se toca por el patrón automático", async () => {

        const { hydrate, createRoutine } = await import("./gymRoutineStore.js");
        await hydrate();

        const routine = await createRoutine({
            name: "Elegida a mano",
            days: [{ id: "d1", title: "Elegida a mano", weekday: "sabado", exercises: [] }],
            progressionNote: ""
        });

        expect(routine.days[0].weekday).toBe("sabado");

    });

    it("las 3 rutinas por defecto ya existentes (sin weekday) no se tocan al crear rutinas nuevas", async () => {

        const { hydrate, createRoutine, getRoutines } = await import("./gymRoutineStore.js");
        await hydrate();

        const before = getRoutines()
            .filter(r => r.id.startsWith("default-"))
            .map(r => ({ id: r.id, weekday: r.days[0]?.weekday ?? null }));

        await createRoutine({ name: "Nueva", days: [{ id: "d1", title: "Nueva", exercises: [] }], progressionNote: "" });

        const after = getRoutines()
            .filter(r => r.id.startsWith("default-"))
            .map(r => ({ id: r.id, weekday: r.days[0]?.weekday ?? null }));

        expect(after).toEqual(before);
        expect(before.every(r => r.weekday === null)).toBe(true); // confirma la premisa: seguían sin weekday

    });

    it("getGymDay busca en TODAS las rutinas guardadas, no solo en una 'activa'", async () => {

        const { hydrate, createRoutine, getGymDay } = await import("./gymRoutineStore.js");
        await hydrate();

        await createRoutine({ name: "Rutina 1", days: [{ id: "dia-a", title: "Día A", exercises: [] }], progressionNote: "" });
        await createRoutine({ name: "Rutina 2", days: [{ id: "dia-b", title: "Día B", exercises: [] }], progressionNote: "" });

        expect(getGymDay("dia-a")?.title).toBe("Día A");
        expect(getGymDay("dia-b")?.title).toBe("Día B");
        expect(getGymDay("no-existe")).toBeNull();

        // Sigue encontrando también los días de las 3 rutinas por defecto.
        expect(getGymDay("day1")?.title).toBe("Torso Completo");

    });

    it("moveRoutineDayToWeekday cambia el weekday de un día suelto sin tocar el resto de la rutina ni de las demás", async () => {

        const { hydrate, createRoutine, moveRoutineDayToWeekday, getGymDay, getRoutineById } = await import("./gymRoutineStore.js");
        await hydrate();

        const routine = await createRoutine({
            name: "Torso",
            days: [
                { id: "dia-lunes", title: "Día 1", weekday: "lunes", exercises: [] },
                { id: "dia-jueves", title: "Día 2", weekday: "jueves", exercises: [] }
            ],
            progressionNote: "nota real"
        });

        const updated = moveRoutineDayToWeekday("dia-lunes", "martes");

        expect(updated.id).toBe(routine.id);
        expect(getGymDay("dia-lunes").weekday).toBe("martes");
        // El otro día de la MISMA rutina no se toca.
        expect(getGymDay("dia-jueves").weekday).toBe("jueves");
        // El resto de la rutina (nombre, nota) tampoco se pierde al reescribir days.
        expect(getRoutineById(routine.id).name).toBe("Torso");
        expect(getRoutineById(routine.id).progressionNote).toBe("nota real");

    });

    it("moveRoutineDayToWeekday devuelve null si el día no pertenece a ninguna rutina guardada", async () => {

        const { hydrate, moveRoutineDayToWeekday } = await import("./gymRoutineStore.js");
        await hydrate();

        expect(moveRoutineDayToWeekday("no-existe", "martes")).toBeNull();

    });

});
