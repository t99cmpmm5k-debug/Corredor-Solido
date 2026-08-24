// Ejercicios que el propio usuario añade a mano desde el constructor de
// rutina, cuando no están en EXERCISE_DATABASE (exerciseDatabase.js) --
// store aparte a propósito, nunca se mezclan con el dataset base (solo se
// SUMAN a él en el buscador, ver exerciseSearch.js).
import { STORES, getAll, put } from "./db.js";
import { generateId } from "../utils/id.js";

const customExercises = [];

let hydrated = null;

export function hydrate() {

    if (hydrated) return hydrated;

    hydrated = getAll(STORES.customExercises).then(loaded => {

        customExercises.push(...loaded);

    }).catch(err => {

        console.warn("No se pudieron cargar los ejercicios personalizados — la app sigue sin persistencia.", err);

    });

    return hydrated;

}

export function getCustomExercises() {

    return customExercises;

}

export function addCustomExercise({ name, muscleGroup }) {

    const exercise = { id: generateId(), name, muscleGroup, custom: true };

    customExercises.push(exercise);
    put(STORES.customExercises, exercise).catch(() => {});

    return exercise;

}
