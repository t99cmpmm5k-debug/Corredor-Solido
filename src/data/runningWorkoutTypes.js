// Tipos de entrenamiento de Running — reutiliza las claves de
// planData.js/WorkoutIcon donde ya existen (easy, series, long) para que
// un rodaje registrado aquí salga con el mismo color que un día "easy"
// del Plan; tempo y race son nuevas, no tienen equivalente en el Plan.
export const RUNNING_WORKOUT_TYPES = [

    { id: "easy", label: "Rodaje (Z2)" },
    { id: "series", label: "Series" },
    { id: "tempo", label: "Tempo" },
    { id: "long", label: "Tirada larga" },
    { id: "race", label: "Carrera" }

];
