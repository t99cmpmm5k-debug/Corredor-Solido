import "./GymExerciseHistorySheet.css";

import { unmarkedSetsTitle } from "../unmarkedSets.js";

// Aviso al "Finalizar entrenamiento" si hay series con kg/reps tocados a
// mano y sin ✓ (ver unmarkedSets.js). Misma hoja inferior que el historial
// de un ejercicio; tocar fuera o el gesto de atrás = "Seguir entrenando".
export function GymUnmarkedSetsSheet(count) {

    return `

        <div class="gym-sheet-backdrop" data-action="unmarked-keep-training"></div>

        <section class="gym-sheet gym-unmarked-sheet" role="dialog" aria-modal="true" aria-labelledby="gym-unmarked-title">

            <span class="gym-sheet-handle" aria-hidden="true"></span>

            <header class="gym-sheet-header">
                <h3 id="gym-unmarked-title">${unmarkedSetsTitle(count)}</h3>
            </header>

            <p class="gym-unmarked-text">Solo las series con ✓ se guardan en el historial.</p>

            <div class="gym-unmarked-actions">
                <button class="gym-finish-button" data-action="unmarked-mark-and-finish">Marcarlas y finalizar</button>
                <button class="gym-bodycomp-cancel" data-action="unmarked-finish-without">Finalizar sin ellas</button>
                <button class="gym-unmarked-link" data-action="unmarked-keep-training">Seguir entrenando</button>
            </div>

        </section>

    `;

}
