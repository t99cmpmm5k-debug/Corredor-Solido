// Tipos de entrenamiento de Running — vocabulario propio, independiente
// del de Plan (WORKOUT_TYPES en src/data/workoutTypes.js desde la
// migración a datos reales). Antes reutilizaba las claves de planData.js
// (easy/series/long); ya no hay solapamiento real entre los dos.
export const RUNNING_WORKOUT_TYPES = [

    { id: "easy", label: "Rodaje (Z2)" },
    { id: "series", label: "Series" },
    { id: "tempo", label: "Tempo" },
    { id: "long", label: "Tirada larga" },
    { id: "race", label: "Carrera" }

];
