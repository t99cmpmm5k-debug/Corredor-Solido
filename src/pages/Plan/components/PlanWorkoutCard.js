import "./PlanWorkoutCard.css";

import { isToday, formatDayMonth } from "../../../utils/date.js";
import { formatSecondsAsClock } from "../../../utils/format.js";
import { WorkoutIcon } from "../../../components/WorkoutIcon/WorkoutIcon.js";
import { getWorkoutForSession } from "../../../data/workoutStore.js";
import { getExpandedSessionId, getSessionMenuOpenId } from "../planStore.js";
import { WORKOUT_TYPES } from "../../../data/workoutTypes.js";

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

// Resumen compacto bajo el título (retoque de cierre: la versión de la
// fase anterior repetía el título real dos veces seguidas -- una vez en
// el <h2> de arriba, otra vez aquí mismo vía `workout.title || label`, p.
// ej. "4 x 1000m" / "4 x 1000m". Aquí ya NO se repite el título -- la
// etiqueta del tipo (WORKOUT_TYPES) va sola, y el segundo dato es
// siempre información NUEVA real: ritmo objetivo si existe, si no zona
// de FC si existe -- nunca un rango inventado (mismos campos reales que
// buildDetails() más abajo, nunca uno inventado). Sin ninguno de los dos,
// no añade nada ahí en vez de forzar un dato que no existe.
function buildSummaryLine(workout) {

    const bits = [];

    if (workout.distanceKm != null) bits.push(`${workout.distanceKm} km`);

    bits.push(WORKOUT_TYPES[workout.type]?.label || "Sesión");

    if (workout.targetPaceSecPerKm != null) {
        bits.push(`Ritmo objetivo ${formatSecondsAsClock(workout.targetPaceSecPerKm)}/km`);
    } else if (workout.targetHrZone != null) {
        bits.push(`Zona de FC ${workout.targetHrZone}`);
    }

    if (workout.durationSec != null) bits.push(formatSecondsAsClock(workout.durationSec));

    return bits.join(" · ");

}

const DESCRIPTION_PREVIEW_LENGTH = 90;

// Primera línea de la descripción real, recortada si hace falta -- nunca
// el párrafo entero. isTruncated decide si de verdad hace falta un
// control de "ver más" (una descripción corta de una sola línea no
// necesita ese botón, ya se ve entera).
function buildDescriptionPreview(description) {

    const trimmed = description.trim();
    const firstLine = trimmed.split("\n")[0].trim();

    const preview = firstLine.length > DESCRIPTION_PREVIEW_LENGTH
        ? `${firstLine.slice(0, DESCRIPTION_PREVIEW_LENGTH).trim()}…`
        : firstLine;

    return { preview, isTruncated: preview !== trimmed };

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

    const isMenuOpen = getSessionMenuOpenId() === workout.id;
    const isExpanded = getExpandedSessionId() === workout.id;

    const { preview, isTruncated } = workout.description
        ? buildDescriptionPreview(workout.description)
        : { preview: null, isTruncated: false };

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

                    <p class="workout-summary-line">

                        ${buildSummaryLine(workout)}

                    </p>

                </div>

                <div class="workout-badge">

                    ${WorkoutIcon(workout.type)}

                </div>

                <div class="workout-menu">

                    <button
                        class="workout-menu-toggle"
                        data-action="toggle-workout-menu"
                        data-session-id="${workout.id}"
                        aria-label="Más opciones"
                    >

                        <iconify-icon icon="solar:menu-dots-bold-duotone"></iconify-icon>

                    </button>

                    ${isMenuOpen ? `

                        <div class="workout-menu-popover">

                            <button data-action="edit-planned-session" data-session-id="${workout.id}">
                                <iconify-icon icon="solar:pen-bold-duotone"></iconify-icon>
                                Editar sesión
                            </button>

                            <button data-action="start-duplicate-session" data-session-id="${workout.id}">
                                <iconify-icon icon="solar:copy-bold-duotone"></iconify-icon>
                                Duplicar
                            </button>

                            <button class="workout-menu-danger" data-action="delete-planned-session" data-session-id="${workout.id}">
                                <iconify-icon icon="solar:trash-bin-trash-bold-duotone"></iconify-icon>
                                Eliminar
                            </button>

                        </div>

                    ` : ""}

                </div>

            </div>

            ${workout.description ? `

                <div class="workout-description-block">

                    <p class="workout-description ${isExpanded ? "workout-description--expanded" : ""}">

                        ${isExpanded ? workout.description : preview}

                    </p>

                    ${isTruncated ? `

                        <button
                            class="workout-expand-toggle"
                            data-action="toggle-workout-description"
                            data-session-id="${workout.id}"
                        >

                            ${isExpanded ? "Ver menos ↑" : "Ver sesión completa →"}

                        </button>

                    ` : ""}

                </div>

            ` : ""}

            ${details.length ? `

                <div class="workout-grid">

                    ${details.map((detail)=>`

                        <div class="workout-item" aria-label="${detail[0]}">

                            <iconify-icon class="item-icon" icon="${getDetailIcon(detail[0])}"></iconify-icon>

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

                    VER ENTRENAMIENTO REGISTRADO

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
