// Rutina fija, a mano — igual que planData.js. weightUnit "kg" o
// "kg/mano" trackean peso; null = sin peso que registrar (corporal,
// controlado, o series de tiempo como la plancha).
export const gymDays = [

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

export function getGymDay(dayId) {

    return gymDays.find(day => day.id === dayId) || null;

}
