import "./PlanWorkoutCard.css";

import { isToday, formatDayMonth } from "../../../utils/date.js";
import { formatSecondsAsClock } from "../../../utils/format.js";
import { WorkoutIcon } from "../../../components/WorkoutIcon/WorkoutIcon.js";
import { getWorkoutForSession } from "../../../data/workoutStore.js";
import { getExpandedSessionId, getSessionMenuOpenId } from "../planStore.js";
import { WORKOUT_TYPES } from "../../../data/workoutTypes.js";
import { resolveDayColorKey } from "../planDayColor.js";

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

// Pulido final (2026-10-01): el subtítulo bajo el título es SOLO el tipo
// ("5 × 1000 m" / "Series") -- distancia, ritmo, zona y duración ya
// viven en las cápsulas de .workout-grid justo debajo, repetirlos aquí
// era la mitad de la altura de la cabecera de la tarjeta.
function typeLabel(workout) {

    return WORKOUT_TYPES[workout.type]?.label || "Sesión";

}

// Resumen corto de la descripción para la tarjeta (máx. ~2-3 líneas) --
// nunca un texto inventado ni un corte a mitad de frase con "…": se
// quedan frases ENTERAS del texto real hasta llenar el hueco, y el resto
// queda para "Ver sesión completa". Los planes en PDF traen la
// descripción por secciones (Objetivo/Estructura/Intensidad/Clave, ver
// importers/plan/pdf.js) -- "Estructura" es justo lo que se va a hacer,
// así que se prefiere esa; si no existe, la primera línea real.
const SUMMARY_MAX_LENGTH = 125;
const SECTION_LABEL_RE = /^(Objetivo|Estructura|Intensidad|Clave):\s*/i;

export function buildDescriptionSummary(description) {

    const full = description.trim();
    const lines = full.split("\n").map(line => line.trim()).filter(Boolean);

    const source = lines.find(line => /^Estructura:/i.test(line)) ?? lines[0] ?? "";
    const text = source.replace(SECTION_LABEL_RE, "");

    const sentences = text.match(/[^.!?]+[.!?]*(\s+|$)/g)?.map(sentence => sentence.trim()).filter(Boolean) ?? [text];

    // Siempre al menos la primera frase entera, aunque pase del tope (el
    // CSS la limita a 3 líneas como red de seguridad) -- recortarla aquí
    // sería justo el corte brusco que se quiere evitar.
    let summary = sentences[0];

    for (const sentence of sentences.slice(1)) {
        const candidate = `${summary} ${sentence}`;
        if (candidate.length > SUMMARY_MAX_LENGTH) break;
        summary = candidate;
    }

    // Una sola frase más larga que el tope puede quedar recortada por el
    // line-clamp del CSS -- también cuenta como "hay más", para que nunca
    // quede texto real inalcanzable sin su "Ver sesión completa".
    return { summary, hasMore: summary !== full || summary.length > SUMMARY_MAX_LENGTH };

}

export function PlanWorkoutCard(workout) {

    if (!workout) {

        return `

            <section class="plan-select-hint">

                <p>Selecciona una sesión de la semana</p>

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

    const { summary, hasMore } = workout.description
        ? buildDescriptionSummary(workout.description)
        : { summary: null, hasMore: false };

    const isCompleted = workout.status === "completed";
    const label = typeLabel(workout);
    const title = workout.title ?? label;

    // Mismo color que el nodo del día en el timeline (planDayColor.js) --
    // verde si ya está hecha, naranja/amarillo/cian por categoría si no.
    const colorClass = `day-color-${resolveDayColorKey(workout)}`;

    return `

        <section class="plan-workout-card ${isCompleted ? "plan-workout-card--completed" : ""}">

            <div class="workout-header">

                <div class="workout-title-block">

                    <div class="workout-day-row">

                        <span class="workout-day">

                            ${isToday(workout.date) ? "HOY · " : ""}${workout.day} ${formatDayMonth(workout.date)}

                        </span>

                        ${isCompleted ? `

                            <span class="workout-status-chip">

                                <iconify-icon icon="solar:check-circle-bold"></iconify-icon>
                                Completada

                            </span>

                        ` : ""}

                    </div>

                    <h2>

                        ${title}

                        ${workout.subtitle ? `<span>${workout.subtitle}</span>` : ""}

                    </h2>

                    ${title !== label ? `

                        <p class="workout-type-line">

                            ${label}

                        </p>

                    ` : ""}

                </div>

                <div class="workout-badge ${colorClass}">

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

                    <!-- Texto pegado a las etiquetas a propósito: la versión
                         expandida usa white-space:pre-wrap (saltos de línea
                         reales del PDF), y así también respetaba la
                         indentación del template -- sangría y líneas en
                         blanco antes y después del texto. -->
                    <p class="workout-description ${isExpanded ? "workout-description--expanded" : ""}">${isExpanded ? workout.description.trim() : summary}</p>

                    ${hasMore ? `

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

                    Mover sesión

                </button>

            `}

        </section>

    `;

}
