import { describe, it, expect, beforeEach } from "vitest";
import {
    isBuilderOpen,
    getBuilderState,
    openBuilder,
    closeBuilder,
    setRoutineName,
    setProgressionNote,
    addDay,
    removeDay,
    setDayTitle,
    setDayWeekday,
    addExerciseToDay,
    removeExerciseFromDay,
    updateExerciseField,
    openExercisePicker,
    closeExercisePicker
} from "./gymRoutineBuilderStore.js";

describe("gymRoutineBuilderStore", () => {

    beforeEach(() => {
        closeBuilder();
    });

    it("cerrado por defecto", () => {
        expect(isBuilderOpen()).toBe(false);
        expect(getBuilderState()).toBeNull();
    });

    it("abrir sin rutina crea un formulario vacío", () => {

        openBuilder();

        expect(isBuilderOpen()).toBe(true);
        expect(getBuilderState()).toMatchObject({ routineId: null, name: "", days: [], progressionNote: "" });

    });

    it("abrir con una rutina existente copia sus datos (modo edición), sin compartir referencia", () => {

        const routine = {
            id: "r1",
            name: "Torso",
            days: [{ id: "d1", title: "Lunes", exercises: [{ id: "e1", name: "Press", sets: 3, targetReps: "8", targetWeight: 40, weightUnit: "kg" }] }],
            progressionNote: "Sube el peso poco a poco"
        };

        openBuilder(routine);

        const state = getBuilderState();
        expect(state.routineId).toBe("r1");
        expect(state.name).toBe("Torso");
        expect(state.days[0].exercises[0].name).toBe("Press");

        // Editar el estado del constructor no debe tocar el objeto original.
        setDayTitle("d1", "Martes");
        expect(routine.days[0].title).toBe("Lunes");

    });

    it("añadir y quitar días", () => {

        openBuilder();
        addDay();
        addDay();

        expect(getBuilderState().days).toHaveLength(2);

        const firstDayId = getBuilderState().days[0].id;
        removeDay(firstDayId);

        expect(getBuilderState().days).toHaveLength(1);

    });

    it("un día nuevo no tiene día de la semana asignado por defecto (\"Sin día fijo\")", () => {

        openBuilder();
        addDay();

        expect(getBuilderState().days[0].weekday).toBeNull();

    });

    // Bug real 2026-08-26: el constructor nunca tuvo forma de asignar
    // weekday -- ninguna rutina creada a mano podía aparecer nunca en
    // "Próximos entrenamientos" (Gimnasio) ni en la línea temporal de
    // Plan, no por un fallo puntual sino porque no existía el campo de
    // origen. setDayWeekday() es el selector nuevo en GymRoutineBuilder.js.
    it("setDayWeekday asigna el día de la semana de un día concreto -- el único vínculo real con Gimnasio/Plan", () => {

        openBuilder();
        addDay();
        const dayId = getBuilderState().days[0].id;

        setDayWeekday(dayId, "miercoles");

        expect(getBuilderState().days[0].weekday).toBe("miercoles");

    });

    it("setDayWeekday con cadena vacía (opción \"Sin día fijo\") vuelve a dejarlo en null, no en \"\"", () => {

        openBuilder();
        addDay();
        const dayId = getBuilderState().days[0].id;

        setDayWeekday(dayId, "viernes");
        setDayWeekday(dayId, "");

        expect(getBuilderState().days[0].weekday).toBeNull();

    });

    it("cambia el nombre de la rutina y la nota de progresión", () => {

        openBuilder();
        setRoutineName("Pierna Funcional");
        setProgressionNote("Añade 2.5kg cada semana si completas todo");

        expect(getBuilderState().name).toBe("Pierna Funcional");
        expect(getBuilderState().progressionNote).toBe("Añade 2.5kg cada semana si completas todo");

    });

    it("añade un ejercicio a un día con series/reps/peso por defecto, editables después", () => {

        openBuilder();
        addDay();
        const dayId = getBuilderState().days[0].id;

        addExerciseToDay(dayId, { name: "Sentadilla", muscleGroup: "Pierna" });

        const exercise = getBuilderState().days[0].exercises[0];
        expect(exercise).toMatchObject({ name: "Sentadilla", muscleGroup: "Pierna", sets: 3, targetReps: "10", targetWeight: null, weightUnit: null });

        updateExerciseField(dayId, exercise.id, "sets", "5");
        updateExerciseField(dayId, exercise.id, "targetReps", "6-8");
        updateExerciseField(dayId, exercise.id, "targetWeight", "80");

        const updated = getBuilderState().days[0].exercises[0];
        expect(updated.sets).toBe(5);
        expect(updated.targetReps).toBe("6-8");
        expect(updated.targetWeight).toBe(80);
        expect(updated.weightUnit).toBe("kg"); // se fija solo al poner peso

    });

    it("vaciar el peso vuelve el ejercicio a 'sin peso' (weightUnit a null)", () => {

        openBuilder();
        addDay();
        const dayId = getBuilderState().days[0].id;
        addExerciseToDay(dayId, { name: "Plancha", muscleGroup: "Core" });
        const exerciseId = getBuilderState().days[0].exercises[0].id;

        updateExerciseField(dayId, exerciseId, "targetWeight", "20");
        expect(getBuilderState().days[0].exercises[0].weightUnit).toBe("kg");

        updateExerciseField(dayId, exerciseId, "targetWeight", "");
        expect(getBuilderState().days[0].exercises[0]).toMatchObject({ targetWeight: null, weightUnit: null });

    });

    it("quita un ejercicio de un día por id", () => {

        openBuilder();
        addDay();
        const dayId = getBuilderState().days[0].id;
        addExerciseToDay(dayId, { name: "Dominadas", muscleGroup: "Espalda" });
        const exerciseId = getBuilderState().days[0].exercises[0].id;

        removeExerciseFromDay(dayId, exerciseId);

        expect(getBuilderState().days[0].exercises).toHaveLength(0);

    });

    it("abre y cierra el selector de ejercicio para un día concreto", () => {

        openBuilder();
        addDay();
        const dayId = getBuilderState().days[0].id;

        openExercisePicker(dayId);
        expect(getBuilderState().picker).toMatchObject({ dayId, query: "", filter: "all" });

        closeExercisePicker();
        expect(getBuilderState().picker).toBeNull();

    });

    it("añadir un ejercicio desde el selector lo cierra automáticamente", () => {

        openBuilder();
        addDay();
        const dayId = getBuilderState().days[0].id;
        openExercisePicker(dayId);

        addExerciseToDay(dayId, { name: "Zancadas", muscleGroup: "Pierna" });

        expect(getBuilderState().picker).toBeNull();
        expect(getBuilderState().days[0].exercises).toHaveLength(1);

    });

});
