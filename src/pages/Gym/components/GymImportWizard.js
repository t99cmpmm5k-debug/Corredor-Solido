import "./GymImportWizard.css";

import { GymImportUploadStep } from "./GymImportUploadStep.js";
import { GymImportReviewStep } from "./GymImportReviewStep.js";

import {
    getImportStep,
    getParsedRoutine,
    getImportParseError,
    getImportSaveError,
    getImportSavedRoutineId,
    getImportSavedPreviousActiveId
} from "../gymImportStore.js";

function GymImportSuccessStep(routineId, previousActiveId) {

    return `

        <section class="gym-wizard wizard-step-success">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-gym-import">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Rutina importada</h2>

            </header>

            <div class="gym-import-success-body">

                <iconify-icon icon="solar:check-circle-bold-duotone"></iconify-icon>

                <p>Tu rutina ya está guardada y activa.</p>

            </div>

            <button class="wizard-primary-button" data-action="close-gym-import">

                Cerrar

            </button>

            ${routineId ? `

                <button
                    class="wizard-undo-button"
                    data-action="undo-gym-import"
                    data-previous-active-id="${previousActiveId ?? ""}"
                >

                    Deshacer esta importación

                </button>

            ` : ""}

        </section>

    `;

}

export function GymImportWizard() {

    const step = getImportStep();

    if (step === "review") return GymImportReviewStep(getParsedRoutine(), getImportSaveError());
    if (step === "success") return GymImportSuccessStep(getImportSavedRoutineId(), getImportSavedPreviousActiveId());

    return GymImportUploadStep(getImportParseError());

}
