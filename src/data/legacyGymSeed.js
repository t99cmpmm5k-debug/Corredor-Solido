// Rutinas semilla heredadas -- hasta 52e0cc7, db.js sembraba en CADA
// instalación nueva estas 3 rutinas (la rutina personal de Rafa, de antes
// del constructor manual) como si fueran datos reales del usuario. La
// siembra ya no existe, pero las instalaciones anteriores las conservan
// como registros normales. Copia EXACTA de src/data/gymData.js en
// 52e0cc7^ (recuperada de git) -- solo para reconocerlas, nunca para
// volver a sembrarlas.
//
// Reconocimiento inequívoco (isUntouchedSeedRoutine): id de semilla
// ("default-day1"...) -- el constructor genera ids aleatorios, así que una
// rutina creada a mano nunca lo tiene aunque se llame igual -- Y mismo
// nombre Y mismos ejercicios/series/repeticiones/peso, en el mismo orden.
// weekday y la nota de progresión no cuentan: asignar día o escribir una
// nota no cambia la plantilla en sí.
export const LEGACY_SEED_DAYS = [

    {
        id: "day1",
        title: "Torso Completo",

        exercises: [
            { id: "press-banca", name: "Press banca", sets: 4, targetReps: "6", targetWeight: 50, weightUnit: "kg", muscleGroup: "Pecho" },
            { id: "dominadas", name: "Dominadas", sets: 3, targetReps: "6-8", targetWeight: null, weightUnit: null, muscleGroup: "Espalda" },
            { id: "remo-mancuerna", name: "Remo mancuerna", sets: 3, targetReps: "8", targetWeight: 22, weightUnit: "kg", muscleGroup: "Espalda" },
            { id: "press-militar", name: "Press militar", sets: 3, targetReps: "8", targetWeight: 30, weightUnit: "kg", muscleGroup: "Hombros" },
            { id: "fondos", name: "Fondos", sets: 3, targetReps: "8-10", targetWeight: null, weightUnit: null, muscleGroup: "Tríceps" },
            { id: "elevaciones-laterales", name: "Elevaciones laterales", sets: 3, targetReps: "12", targetWeight: 8, weightUnit: "kg", muscleGroup: "Hombros" }
        ]
    },

    {
        id: "day2",
        title: "Pierna Funcional",

        exercises: [
            { id: "prensa", name: "Prensa", sets: 4, targetReps: "8", targetWeight: 140, weightUnit: "kg", muscleGroup: "Piernas" },
            { id: "peso-muerto", name: "Peso muerto", sets: 3, targetReps: "6", targetWeight: 50, weightUnit: "kg", muscleGroup: "Piernas" },
            { id: "zancadas", name: "Zancadas", sets: 3, targetReps: "10", targetWeight: 16, weightUnit: "kg/mano", muscleGroup: "Piernas" },
            { id: "gemelos", name: "Gemelos", sets: 3, targetReps: "12", targetWeight: 80, weightUnit: "kg", muscleGroup: "Piernas" },
            { id: "plancha", name: "Plancha (core)", sets: 3, targetReps: "40-60s", targetWeight: null, weightUnit: null, muscleGroup: "Core" }
        ]
    },

    {
        id: "day3",
        title: "Full Body + Estabilizadores",

        exercises: [
            { id: "press-inclinado", name: "Press inclinado", sets: 3, targetReps: "8", targetWeight: 40, weightUnit: "kg", muscleGroup: "Pecho" },
            { id: "jalon-pecho", name: "Jalón al pecho", sets: 3, targetReps: "8", targetWeight: 50, weightUnit: "kg", muscleGroup: "Espalda" },
            { id: "hip-thrust", name: "Hip thrust", sets: 3, targetReps: "8", targetWeight: 60, weightUnit: "kg", muscleGroup: "Glúteos" },
            { id: "remo-trx-polea", name: "Remo TRX/polea", sets: 3, targetReps: "10", targetWeight: null, weightUnit: null, muscleGroup: "Espalda" },
            { id: "hombro-posterior", name: "Hombro posterior", sets: 3, targetReps: "12", targetWeight: 6, weightUnit: "kg", muscleGroup: "Hombros" },
            { id: "dead-bug-pallof", name: "Dead bug / Pallof", sets: 3, targetReps: "10-12", targetWeight: null, weightUnit: null, muscleGroup: "Core" }
        ]
    }

];

const EXERCISE_FIELDS = ["id", "name", "sets", "targetReps", "targetWeight", "weightUnit", "muscleGroup"];

function sameExercises(actual, expected) {

    if (!Array.isArray(actual) || actual.length !== expected.length) return false;

    return expected.every((exercise, index) =>
        EXERCISE_FIELDS.every(field => (actual[index]?.[field] ?? null) === (exercise[field] ?? null))
    );

}

export function legacySeedRoutineId(seedDay) {

    return `default-${seedDay.id}`;

}

// La semilla de la que viene la rutina si sigue intacta, o null.
export function matchUntouchedSeedRoutine(routine) {

    const seedDay = LEGACY_SEED_DAYS.find(day => legacySeedRoutineId(day) === routine?.id);
    if (!seedDay) return null;

    if (routine.name !== seedDay.title) return null;
    if (!Array.isArray(routine.days) || routine.days.length !== 1) return null;

    const [day] = routine.days;
    if (day.id !== seedDay.id || day.title !== seedDay.title) return null;
    if (!sameExercises(day.exercises, seedDay.exercises)) return null;

    return seedDay;

}

export function isUntouchedSeedRoutine(routine) {

    return matchUntouchedSeedRoutine(routine) !== null;

}
