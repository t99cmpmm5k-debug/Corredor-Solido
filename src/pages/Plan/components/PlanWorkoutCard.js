import "./PlanWorkoutCard.css";

import { isToday, formatDayMonth } from "../../../utils/date.js";
import { WorkoutIcon } from "../../../components/WorkoutIcon/WorkoutIcon.js";

// Icono por lo que dice la etiqueta, no por posición — cada tipo de
// sesión trae las suyas (planData.js) y antes se pintaban con un array
// fijo de 4 emojis que no tenían relación con el dato. Todos estos
// slugs verificados uno a uno contra la API de Iconify antes de usarlos
// (mismo cuidado que con el de "tirada larga").
const DETAIL_ICONS = {
    "duración": "solar:clock-circle-bold-duotone",
    "zona": "solar:heart-pulse-bold-duotone",
    "objetivo": "solar:target-bold-duotone",
    "ritmo": "solar:playback-speed-bold-duotone",
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

export function PlanWorkoutCard(workout) {

    return `

        <section class="plan-workout-card">

            <div class="workout-header">

                <div class="workout-title-block">

                    <span class="workout-day">

                        ${isToday(workout.date) ? "HOY · " : ""}${workout.day} ${formatDayMonth(workout.date)}

                    </span>

                    <h2>

                        ${workout.title}

                        <span>

                            ${workout.subtitle}

                        </span>

                    </h2>

                </div>

                <div class="workout-badge">

                    ${WorkoutIcon(workout.type)}

                </div>

            </div>

            <p class="workout-description">

                ${workout.description}

            </p>

            <div class="workout-grid">

                ${workout.details.map((detail)=>`

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

            <button class="workout-button">

                VER DETALLES DE LA SESIÓN

            </button>

        </section>

    `;

}