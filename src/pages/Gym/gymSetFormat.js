// Formato de una serie guardada (kg × reps) -- compartido por la columna
// "Anterior" de la sesión en curso, la hoja de historial de un ejercicio y
// el historial de entrenos, para que el mismo dato se lea igual en todas.
import { getRoutines } from "../../data/gymRoutineStore.js";

// Hasta 2 decimales (discos de 1,25 kg), sin ceros de sobra, coma decimal.
// No formatKm(): redondea a 1 decimal y "61,25" saldría como "61,3".
export function formatWeightNumber(weight) {

    const rounded = Math.round(weight * 100) / 100;

    return String(rounded).replace(".", ",");

}

export function weightUnitLabel(weightUnit) {

    return weightUnit === "kg/mano" ? "kg/mano" : "kg";

}

// "40 kg × 10" | "10 reps" (sin peso: plancha, core...) | "40 kg" (sin
// reps guardadas) | "—".
export function formatSetText(set, weightUnit = "kg") {

    if (!set) return "—";

    const hasWeight = set.weight != null;
    const hasReps = set.reps != null;

    if (hasWeight && hasReps) return `${formatWeightNumber(set.weight)} ${weightUnitLabel(weightUnit)} × ${set.reps}`;
    if (hasWeight) return `${formatWeightNumber(set.weight)} ${weightUnitLabel(weightUnit)}`;
    if (hasReps) return `${set.reps} reps`;

    return "—";

}

// Versión corta para la celda "Anterior" de la tabla de series: "40×10",
// solo "10" en ejercicios sin peso.
export function formatSetCompact(set) {

    if (!set) return "—";

    if (set.weight != null) return `${formatWeightNumber(set.weight)}${set.reps != null ? `×${set.reps}` : ""}`;
    if (set.reps != null) return String(set.reps);

    return "—";

}

// Unidad de peso de un ejercicio guardado: la sesión no la guarda (solo
// exerciseId/nombre/series), así que se mira en la rutina; si la rutina
// ya no existe, "kg" -- la única que crea el constructor.
export function routineExerciseWeightUnit(exerciseId) {

    for (const routine of getRoutines()) {

        for (const day of routine.days || []) {

            const exercise = (day.exercises || []).find(e => e.id === exerciseId);
            if (exercise) return exercise.weightUnit || "kg";

        }

    }

    return "kg";

}
