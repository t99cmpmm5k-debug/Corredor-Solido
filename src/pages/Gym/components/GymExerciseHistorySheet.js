import "./GymExerciseHistorySheet.css";

import { getExerciseLog } from "../../../data/gymSessionStore.js";
import { formatDayMonth } from "../../../utils/date.js";
import { formatSetText } from "../gymSetFormat.js";

const SHEET_SESSIONS = 5;

// Hoja que se abre al tocar el nombre de un ejercicio durante la sesión:
// las últimas 5 sesiones REALES de ese ejercicio (fecha + cada serie kg ×
// reps) y el mejor peso de todo su historial. Sustituye a la antigua
// pantalla de detalle (HISTORIAL/GRÁFICAS con volumen) -- pedido explícito:
// nada de 1RM ni tonelaje, solo lo que se guardó.
//
// excludeSessionId: la sesión en curso no es "historial" todavía (mismo
// criterio que la columna "Anterior").
export function GymExerciseHistorySheet(definition, excludeSessionId) {

    const { entries, best } = getExerciseLog(definition.id, {
        name: definition.name,
        excludeSessionId,
        limit: SHEET_SESSIONS
    });

    const unit = definition.weightUnit;

    return `

        <div class="gym-sheet-backdrop" data-action="close-exercise-detail"></div>

        <section class="gym-sheet" role="dialog" aria-modal="true" aria-label="Historial de ${definition.name}">

            <span class="gym-sheet-handle" aria-hidden="true"></span>

            <header class="gym-sheet-header">

                <h3>${definition.name}</h3>

                <button class="gym-close" data-action="close-exercise-detail" aria-label="Cerrar">
                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>
                </button>

            </header>

            ${best ? `

                <div class="gym-sheet-best">
                    <span class="gym-sheet-best-label">Mejor peso</span>
                    <strong>${formatSetText(best, unit)}</strong>
                    <span class="gym-sheet-best-date">${formatDayMonth(best.date)}</span>
                </div>

            ` : ""}

            ${entries.length ? `

                <p class="gym-sheet-subtitle">${entries.length === 1 ? "Última sesión" : `Últimas ${entries.length} sesiones`}</p>

                <ul class="gym-sheet-sessions">

                    ${entries.map(entry => `

                        <li class="gym-sheet-session">

                            <span class="gym-sheet-session-date">${formatDayMonth(entry.date)}</span>

                            <ol class="gym-sheet-session-sets">
                                ${entry.sets.map(set => `<li>${formatSetText(set, unit)}</li>`).join("")}
                            </ol>

                        </li>

                    `).join("")}

                </ul>

            ` : `<p class="gym-sheet-empty">Primera vez: aún no hay ninguna sesión guardada de este ejercicio.</p>`}

        </section>

    `;

}
