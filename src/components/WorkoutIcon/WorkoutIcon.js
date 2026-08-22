import "./WorkoutIcon.css";

// Ids de WORKOUT_TYPES (src/data/workoutTypes.js). Todos verificados uno
// a uno contra el set real de iconos Solar antes de usarlos — "circle"
// (libre) y "mountains" (tirada larga) que había antes NO existen de
// verdad en Solar, se sustituyen aquí de paso.
const ICONS = {

    recovery: {

        icon: "solar:heart-pulse-bold-duotone"

    },

    z2: {

        icon: "solar:running-bold-duotone"

    },

    tempo: {

        icon: "solar:playback-speed-bold-duotone"

    },

    intervals: {

        icon: "solar:bolt-bold-duotone"

    },

    longRun: {

        icon: "solar:route-bold-duotone"

    },

    race: {

        icon: "solar:flag-bold-duotone"

    },

    strength: {

        icon: "solar:dumbbell-large-bold-duotone"

    },

    free: {

        icon: "solar:cup-hot-bold-duotone"

    },

    generic: {

        icon: "solar:widget-bold-duotone"

    }

};

// Icono en crudo (el string de Iconify) para sitios que no pueden montar
// el <div> completo de WorkoutIcon — p. ej. un marcador de MonthCalendar,
// que ya pone su propio color inline. Misma fuente de verdad que
// WorkoutIcon() (ICONS de arriba), nunca un segundo mapa.
export function getWorkoutIcon(type) {

    const resolvedType = ICONS[type] ? type : "generic";
    return ICONS[resolvedType].icon;

}

export function WorkoutIcon(

    type,

    {

        selected = false,

        completed = false,

        size = "md"

    } = {}

) {

    const resolvedType = ICONS[type] ? type : "generic";
    const workout = ICONS[resolvedType];

    const classes = [

        "workout-icon",

        resolvedType,

        size

    ];

    if (completed) {

        classes.push("completed");

    }

    if (selected) {

        classes.push("selected");

    }

    return `

        <div class="${classes.join(" ")}">

            <iconify-icon

                icon="${workout.icon}"

            ></iconify-icon>

        </div>

    `;

}