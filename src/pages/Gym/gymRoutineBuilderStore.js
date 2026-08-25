// Estado del constructor manual de rutinas -- reemplaza al wizard de
// importación por PDF (gymImportStore.js, eliminado). null = cerrado.
// Un solo formulario editable de una tacada (sin pasos tipo wizard):
// nombre, días con sus ejercicios, nota de progresión.
import { generateId } from "../../utils/id.js";

let state = null;

export function isBuilderOpen() {

    return state !== null;

}

export function getBuilderState() {

    return state;

}

// routine=null crea una rutina nueva vacía; con una rutina existente,
// abre en modo edición (copia profunda -- cancelar no debe tocar la
// rutina guardada hasta que se pulse "Guardar").
export function openBuilder(routine = null) {

    state = routine
        ? {
            routineId: routine.id,
            name: routine.name,
            // Copia TODOS los campos del día (spread), no solo id/title --
            // listarlos a mano aquí fue justo el bug: day.weekday (el
            // vínculo real con Plan, ver gymTimelineBridge.js) se quedaba
            // fuera de la copia y se perdía para siempre en cuanto se
            // guardaba la rutina desde este formulario, aunque lo único que
            // se tocara fuera el nombre. exercises sí se copia a mano
            // (nueva referencia) para que editar el borrador no mute los
            // ejercicios de la rutina guardada mientras el modal está abierto.
            days: routine.days.map(day => ({
                ...day,
                exercises: day.exercises.map(ex => ({ ...ex }))
            })),
            progressionNote: routine.progressionNote || "",
            picker: null,
            saveError: null
        }
        : {
            routineId: null,
            name: "",
            days: [],
            progressionNote: "",
            picker: null,
            saveError: null
        };

}

export function closeBuilder() {

    state = null;

}

export function setRoutineName(name) {

    if (state) state.name = name;

}

export function setProgressionNote(text) {

    if (state) state.progressionNote = text;

}

export function setSaveError(message) {

    if (state) state.saveError = message;

}

export function addDay() {

    if (!state) return;

    state.days.push({
        id: generateId(),
        title: `Día ${state.days.length + 1}`,
        exercises: []
    });

}

export function removeDay(dayId) {

    if (!state) return;

    state.days = state.days.filter(d => d.id !== dayId);

}

export function setDayTitle(dayId, title) {

    const day = state?.days.find(d => d.id === dayId);
    if (day) day.title = title;

}

export function openExercisePicker(dayId) {

    if (state) state.picker = { dayId, query: "", filter: "all" };

}

export function closeExercisePicker() {

    if (state) state.picker = null;

}

export function setPickerQuery(query) {

    if (state?.picker) state.picker.query = query;

}

export function setPickerFilter(filterId) {

    if (state?.picker) state.picker.filter = filterId;

}

// exercise: { name, muscleGroup } (de EXERCISE_DATABASE, de un
// personalizado, o del propio formulario "añadir ejercicio propio").
export function addExerciseToDay(dayId, exercise) {

    const day = state?.days.find(d => d.id === dayId);
    if (!day) return;

    day.exercises.push({
        id: generateId(),
        name: exercise.name,
        muscleGroup: exercise.muscleGroup ?? null,
        sets: 3,
        targetReps: "10",
        targetWeight: null,
        weightUnit: null
    });

    state.picker = null;

}

export function removeExerciseFromDay(dayId, exerciseId) {

    const day = state?.days.find(d => d.id === dayId);
    if (!day) return;

    day.exercises = day.exercises.filter(e => e.id !== exerciseId);

}

// field: "sets" | "targetReps" | "targetWeight". targetWeight en null (o
// cadena vacía) vuelve el ejercicio "sin peso" (weightUnit a null,
// mismo criterio que gymData.js: null = corporal/controlado/series de
// tiempo, no aparece columna Peso en la sesión) -- con un valor, se fija
// a "kg", único que ofrece el constructor por ahora.
export function updateExerciseField(dayId, exerciseId, field, rawValue) {

    const day = state?.days.find(d => d.id === dayId);
    const exercise = day?.exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    if (field === "sets") {
        exercise.sets = Math.max(1, Number(rawValue) || 1);
        return;
    }

    if (field === "targetReps") {
        exercise.targetReps = rawValue;
        return;
    }

    if (field === "targetWeight") {
        const trimmed = String(rawValue).trim();
        if (trimmed === "") {
            exercise.targetWeight = null;
            exercise.weightUnit = null;
        } else {
            exercise.targetWeight = Number(trimmed);
            exercise.weightUnit = "kg";
        }
    }

}
