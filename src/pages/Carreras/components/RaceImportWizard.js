import { RaceImportUploadStep } from "./RaceImportUploadStep.js";
import { RaceImportReviewStep } from "./RaceImportReviewStep.js";

import {
    getRaceImportStep,
    getParsedRaces,
    getRaceImportParseError,
    getRaceImportSaveError,
    getRaceImportSavedCount,
    getRaceImportSavedBatchId
} from "../raceImportStore.js";

function RaceImportSuccessStep(savedCount, savedBatchId) {

    const count = savedCount ?? 0;

    return `

        <section class="carreras-wizard race-step-success">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-race-import">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Carreras importadas</h2>

            </header>

            <div class="race-import-success-body">

                <iconify-icon icon="solar:check-circle-bold-duotone"></iconify-icon>

                <p>${count === 1 ? "Se ha guardado 1 carrera." : `Se han guardado ${count} carreras.`}</p>

            </div>

            <button class="wizard-primary-button" data-action="close-race-import">

                Cerrar

            </button>

            ${count > 0 && savedBatchId ? `

                <button
                    class="wizard-undo-button"
                    data-action="undo-race-import"
                    data-batch-id="${savedBatchId}"
                >

                    Deshacer esta importación

                </button>

            ` : ""}

        </section>

    `;

}

export function RaceImportWizard() {

    const step = getRaceImportStep();

    if (step === "review") return RaceImportReviewStep(getParsedRaces(), getRaceImportSaveError());
    if (step === "success") return RaceImportSuccessStep(getRaceImportSavedCount(), getRaceImportSavedBatchId());

    return RaceImportUploadStep(getRaceImportParseError());

}
