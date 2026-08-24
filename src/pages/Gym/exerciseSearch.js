// Búsqueda de ejercicios del constructor de rutina -- combina el dataset
// base (EXERCISE_DATABASE, estático) con los ejercicios personalizados del
// usuario (customExerciseStore, IndexedDB), sin mezclarlos en el store: se
// suman solo aquí, en el resultado de la búsqueda.
import { EXERCISE_DATABASE } from "../../data/exerciseDatabase.js";
import { getCustomExercises } from "../../data/customExerciseStore.js";

// Grupos "puros" tal cual los pidió el usuario, más dos calculados (tren
// superior/inferior = unión de varios grupos puros) -- "full body" no se
// ofrece: el dataset no marca ningún ejercicio como multi-grupo, y
// derivarlo a mano sería inventar un criterio que no está en los datos
// (decisión ya confirmada).
export const MUSCLE_GROUPS = ["Pecho", "Espalda", "Pierna", "Hombro", "Brazo", "Core"];

const UPPER_BODY_GROUPS = new Set(["Pecho", "Espalda", "Hombro", "Brazo"]);
const LOWER_BODY_GROUPS = new Set(["Pierna"]);

export const FILTER_OPTIONS = [
    { id: "all", label: "Todos" },
    { id: "tren-superior", label: "Tren superior" },
    { id: "tren-inferior", label: "Tren inferior" },
    ...MUSCLE_GROUPS.map(g => ({ id: g, label: g }))
];

function matchesFilter(exercise, filterId) {

    if (filterId === "all") return true;
    if (filterId === "tren-superior") return UPPER_BODY_GROUPS.has(exercise.muscleGroup);
    if (filterId === "tren-inferior") return LOWER_BODY_GROUPS.has(exercise.muscleGroup);

    return exercise.muscleGroup === filterId;

}

// Todos los ejercicios disponibles para elegir -- base + personalizados,
// los personalizados al final (son los que el usuario acaba de crear, se
// espera verlos "recientes" al fondo de su propio grupo).
export function getAllExercises() {

    return [...EXERCISE_DATABASE, ...getCustomExercises()];

}

export function searchExercises(query, filterId = "all") {

    const trimmed = query.trim().toLowerCase();

    return getAllExercises().filter(exercise => {

        if (!matchesFilter(exercise, filterId)) return false;
        if (!trimmed) return true;

        return exercise.name.toLowerCase().includes(trimmed);

    });

}
