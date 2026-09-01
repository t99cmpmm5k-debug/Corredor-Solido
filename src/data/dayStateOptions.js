// "Estado del día" (Running, V1) — vocabulario de las opciones manuales
// que el usuario puede añadir a un entreno YA IMPORTADO, puro contexto
// subjetivo (nunca sustituye ni corrige un dato real del propio entreno,
// ver updateWorkoutDayState() en workoutStore.js). Todo opcional: un
// entreno sin ningún campo de dayState se comporta exactamente igual que
// antes de que esta función existiera.
export const LEGS_FEELING_OPTIONS = [
    { id: "fresh", label: "Frescas" },
    { id: "normal", label: "Normales" },
    { id: "heavy", label: "Pesadas" }
];

export const FATIGUE_LEVEL_OPTIONS = [
    { id: "low", label: "Baja" },
    { id: "medium", label: "Media" },
    { id: "high", label: "Alta" }
];

export const HEAT_FEELING_OPTIONS = [
    { id: "low", label: "Bajo" },
    { id: "medium", label: "Medio" },
    { id: "high", label: "Alto" }
];

// 1-10, mismo rango que pide la especificación -- generado aquí (no a
// mano en el <select>) para no repetir 10 <option> literales.
export const SESSION_RATING_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
