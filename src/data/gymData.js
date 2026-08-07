// Rutina fija, a mano — igual que planData.js. weightUnit "kg" o
// "kg/mano" trackean peso; null = sin peso que registrar (corporal,
// controlado, o series de tiempo como la plancha).
export const gymDays = [

    {
        id: "day1",
        title: "Torso Completo",

        exercises: [
            { id: "press-banca", name: "Press banca", sets: 4, targetReps: "6", targetWeight: 50, weightUnit: "kg" },
            { id: "dominadas", name: "Dominadas", sets: 3, targetReps: "6-8", targetWeight: null, weightUnit: null },
            { id: "remo-mancuerna", name: "Remo mancuerna", sets: 3, targetReps: "8", targetWeight: 22, weightUnit: "kg" },
            { id: "press-militar", name: "Press militar", sets: 3, targetReps: "8", targetWeight: 30, weightUnit: "kg" },
            { id: "fondos", name: "Fondos", sets: 3, targetReps: "8-10", targetWeight: null, weightUnit: null },
            { id: "elevaciones-laterales", name: "Elevaciones laterales", sets: 3, targetReps: "12", targetWeight: 8, weightUnit: "kg" }
        ]
    },

    {
        id: "day2",
        title: "Pierna Funcional",

        exercises: [
            { id: "prensa", name: "Prensa", sets: 4, targetReps: "8", targetWeight: 140, weightUnit: "kg" },
            { id: "peso-muerto", name: "Peso muerto", sets: 3, targetReps: "6", targetWeight: 50, weightUnit: "kg" },
            { id: "zancadas", name: "Zancadas", sets: 3, targetReps: "10", targetWeight: 16, weightUnit: "kg/mano" },
            { id: "gemelos", name: "Gemelos", sets: 3, targetReps: "12", targetWeight: 80, weightUnit: "kg" },
            { id: "plancha", name: "Plancha (core)", sets: 3, targetReps: "40-60s", targetWeight: null, weightUnit: null }
        ]
    },

    {
        id: "day3",
        title: "Full Body + Estabilizadores",

        exercises: [
            { id: "press-inclinado", name: "Press inclinado", sets: 3, targetReps: "8", targetWeight: 40, weightUnit: "kg" },
            { id: "jalon-pecho", name: "Jalón al pecho", sets: 3, targetReps: "8", targetWeight: 50, weightUnit: "kg" },
            { id: "hip-thrust", name: "Hip thrust", sets: 3, targetReps: "8", targetWeight: 60, weightUnit: "kg" },
            { id: "remo-trx-polea", name: "Remo TRX/polea", sets: 3, targetReps: "10", targetWeight: null, weightUnit: null },
            { id: "hombro-posterior", name: "Hombro posterior", sets: 3, targetReps: "12", targetWeight: 6, weightUnit: "kg" },
            { id: "dead-bug-pallof", name: "Dead bug / Pallof", sets: 3, targetReps: "10-12", targetWeight: null, weightUnit: null }
        ]
    }

];

export function getGymDay(dayId) {

    return gymDays.find(day => day.id === dayId) || null;

}
