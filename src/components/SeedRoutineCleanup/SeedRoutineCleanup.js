import "./SeedRoutineCleanup.css";
import { getRoutines } from "../../data/gymRoutineStore.js";
import { getGymSessions } from "../../data/gymSessionStore.js";
import {
    loadSeedCleanupState,
    getPendingSeedRoutines,
    markSeedCleanupDone,
    resolveSeedCleanup,
    stampKeptDecisions
} from "../../data/legacyGymSeedCleanup.js";

// Aviso único de limpieza de rutinas semilla (ver legacyGymSeedCleanup.js).
// Se monta fuera de #app, igual que el aviso de actualización
// (updateNotifier.js): render() reemplaza el innerHTML de #app entero y se
// lo llevaría por delante. Casillas desmarcadas por defecto -- no marcar
// nada y confirmar equivale a conservarlas todas.
const OVERLAY_CLASS = "seed-cleanup-overlay";

function sessionCountFor(routine) {

    const dayIds = new Set(routine.days.map(day => day.id));
    return getGymSessions().filter(session => dayIds.has(session.dayId)).length;

}

function sessionLabel(count) {

    if (count === 0) return "Sin sesiones registradas";
    return count === 1 ? "1 sesión registrada" : `${count} sesiones registradas`;

}

function showSeedCleanupDialog(candidates, state, onResolved) {

    if (document.querySelector(`.${OVERLAY_CLASS}`)) return;

    const overlay = document.createElement("div");
    overlay.className = OVERLAY_CLASS;

    overlay.innerHTML = `

        <div class="seed-cleanup-dialog" role="dialog" aria-modal="true" aria-labelledby="seed-cleanup-title">

            <iconify-icon class="seed-cleanup-icon" icon="solar:dumbbell-large-bold-duotone"></iconify-icon>

            <h2 id="seed-cleanup-title">Rutinas de ejemplo en Gimnasio</h2>

            <p class="seed-cleanup-text">
                ${candidates.length === 1 ? "Esta rutina venía" : "Estas rutinas venían"} de serie con la app, no ${candidates.length === 1 ? "la creaste" : "las creaste"} tú.
                Marca las que quieras eliminar. Tu historial de sesiones se conserva.
            </p>

            <ul class="seed-cleanup-list">

                ${candidates.map(routine => `

                    <li>

                        <label class="seed-cleanup-item">

                            <input type="checkbox" value="${routine.id}">

                            <span class="seed-cleanup-item-text">
                                <strong>${routine.name}</strong>
                                <small>${sessionLabel(sessionCountFor(routine))}</small>
                            </span>

                        </label>

                    </li>

                `).join("")}

            </ul>

            <div class="seed-cleanup-actions">

                <button type="button" class="seed-cleanup-keep">Conservar todas</button>

                <button type="button" class="seed-cleanup-delete" disabled>Eliminar marcadas</button>

            </div>

        </div>

    `;

    const deleteButton = overlay.querySelector(".seed-cleanup-delete");
    const checkboxes = [...overlay.querySelectorAll('input[type="checkbox"]')];

    checkboxes.forEach(box => box.addEventListener("change", () => {
        deleteButton.disabled = !checkboxes.some(b => b.checked);
    }));

    const finish = selectedIds => {
        resolveSeedCleanup(candidates, selectedIds, state).then(() => {
            overlay.remove();
            onResolved();
        });
    };

    overlay.querySelector(".seed-cleanup-keep").addEventListener("click", () => finish([]));

    deleteButton.addEventListener("click", () => {
        finish(checkboxes.filter(b => b.checked).map(b => b.value));
    });

    document.body.appendChild(overlay);

}

// Llamar con las rutinas ya hidratadas. onResolved: repintar la pantalla
// actual (Gimnasio podría estar mostrando una rutina recién borrada).
export function initSeedRoutineCleanup(onResolved) {

    return loadSeedCleanupState().then(state => {

        stampKeptDecisions(getRoutines(), state);

        if (state.done) return;

        const candidates = getPendingSeedRoutines(getRoutines(), state);

        if (!candidates.length) {
            markSeedCleanupDone(state);
            return;
        }

        showSeedCleanupDialog(candidates, state, onResolved);

    });

}
