import "./PlanWorkoutCard.css";

import { isToday, formatDayMonth } from "../../../utils/date.js";
import { formatSecondsAsClock } from "../../../utils/format.js";
import { WorkoutIcon } from "../../../components/WorkoutIcon/WorkoutIcon.js";
import { getWorkoutForSession } from "../../../data/workoutStore.js";

// Icono por lo que dice la etiqueta, no por posición — cada tipo de
// sesión trae las suyas (planData.js) y antes se pintaban con un array
// fijo de 4 emojis que no tenían relación con el dato. Todos estos
// slugs verificados uno a uno contra la API de Iconify antes de usarlos
// (mismo cuidado que con el de "tirada larga").
const DETAIL_ICONS = {
    "duración": "solar:clock-circle-bold-duotone",
    "zona": "solar:heart-pulse-bold-duotone",
    "zona de fc": "solar:heart-pulse-bold-duotone",
    "objetivo": "solar:target-bold-duotone",
    "ritmo": "solar:playback-speed-bold-duotone",
    "ritmo objetivo": "solar:playback-speed-bold-duotone",
    "pierna": "solar:dumbbell-large-bold-duotone",
    "core": "solar:dumbbell-small-bold-duotone",
    "series": "solar:repeat-bold-duotone",
    "descanso": "solar:moon-bold-duotone",
    "distancia": "solar:route-bold-duotone",
    "cadencia": "solar:pulse-bold-duotone",
    "calentamiento": "solar:fire-bold-duotone",
    "serie principal": "solar:bolt-bold-duotone",
    "recuperación": "solar:refresh-circle-bold-duotone",
    "movilidad": "solar:stretching-bold-duotone",
    "paseo": "solar:walking-bold-duotone",
    "foam roller": "solar:meditation-bold-duotone",
    "avituallamiento": "solar:bottle-bold-duotone",
    "actividad": "solar:compass-bold-duotone"
};

const DEFAULT_DETAIL_ICON = "solar:info-circle-bold-duotone";

function getDetailIcon(label) {

    return DETAIL_ICONS[label.toLowerCase()] ?? DEFAULT_DETAIL_ICON;

}

// A diferencia de planData.js (que traía un array "details" ya hecho a
// mano), una sesión real solo trae campos sueltos — se construyen las
// filas aquí mismo a partir de los que de verdad tengan valor, nunca una
// fila para un dato ausente.
function buildDetails(workout) {

    const rows = [];

    if (workout.distanceKm != null) rows.push(["Distancia", `${workout.distanceKm} km`]);
    if (workout.durationSec != null) rows.push(["Duración", formatSecondsAsClock(workout.durationSec)]);
    if (workout.targetPaceSecPerKm != null) rows.push(["Ritmo objetivo", `${formatSecondsAsClock(workout.targetPaceSecPerKm)}/km`]);
    if (workout.targetHrZone != null) rows.push(["Zona de FC", workout.targetHrZone]);

    return rows;

}

export function PlanWorkoutCard(workout) {

    if (!workout) {

        return `

            <section class="plan-workout-card plan-workout-card--empty">

                <p>Selecciona un día del calendario para ver su sesión.</p>

            </section>

        `;

    }

    const details = buildDetails(workout);

    // Solo hay "detalle" real que mostrar cuando la sesión ya tiene un
    // entreno de verdad enlazado (linkedSessionId) — antes de eso la
    // tarjeta ya enseña todo lo que hay (título/descripción/tipo).
    const linkedWorkout = getWorkoutForSession(workout.id);

    return `

        <section class="plan-workout-card">

            <div class="workout-header">

                <div class="workout-title-block">

                    <span class="workout-day">

                        ${isToday(workout.date) ? "HOY · " : ""}${workout.day} ${formatDayMonth(workout.date)}

                    </span>

                    <h2>

                        ${workout.title ?? "Sesión"}

                        ${workout.subtitle ? `<span>${workout.subtitle}</span>` : ""}

                    </h2>

                </div>

                <div class="workout-badge">

                    ${WorkoutIcon(workout.type)}

                </div>

                <button
                    class="workout-delete"
                    data-action="delete-planned-session"
                    data-session-id="${workout.id}"
                >

                    <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>

                </button>

            </div>

            ${workout.description ? `

                <p class="workout-description">

                    ${workout.description}

                </p>

            ` : ""}

            ${details.length ? `

                <div class="workout-grid">

                    ${details.map((detail)=>`

                        <div class="workout-item">

                            <div class="item-label">

                                <iconify-icon class="item-icon" icon="${getDetailIcon(detail[0])}"></iconify-icon>

                                <span>

                                    ${detail[0]}

                                </span>

                            </div>

                            <strong>

                                ${detail[1]}

                            </strong>

                        </div>

                    `).join("")}

                </div>

            ` : ""}

            ${linkedWorkout ? `

                <button
                    class="workout-button"
                    data-action="view-session-workout"
                    data-workout-id="${linkedWorkout.id}"
                >

                    VER DETALLES DE LA SESIÓN

                </button>

            ` : `

                <button
                    class="workout-button workout-button--ghost"
                    data-action="start-move-session"
                    data-session-id="${workout.id}"
                >

                    MOVER SESIÓN

                </button>

            `}

        </section>

    `;

}
