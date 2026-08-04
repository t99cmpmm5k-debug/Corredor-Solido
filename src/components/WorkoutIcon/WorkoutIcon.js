import "./WorkoutIcon.css";

const ICONS = {

    easy: {

        icon: "solar:running-bold-duotone"

    },

    gym: {

        icon: "solar:dumbbell-large-bold-duotone"

    },

    series: {

        icon: "solar:bolt-bold-duotone"

    },

    rest: {

        icon: "solar:moon-bold-duotone"

    },

    long: {

        icon: "solar:mountains-bold-duotone"

    },

    free: {

        icon: "solar:circle-bold-duotone"

    }

};

export function WorkoutIcon(

    type,

    {

        selected = false,

        completed = false,

        size = "md"

    } = {}

) {

    const workout = ICONS[type] || ICONS.free;

    const classes = [

        "workout-icon",

        type,

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