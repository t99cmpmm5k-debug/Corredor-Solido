import { PlanImportUploadStep } from "./PlanImportUploadStep.js";
import { PlanImportReviewStep } from "./PlanImportReviewStep.js";

import {
    getImportStep,
    getParsedPlan,
    getImportParseError,
    getImportSaveError,
    getImportSavedCount,
    getImportSavedBatchId
} from "../planImportStore.js";

function PlanImportSuccessStep(savedCount, savedBatchId) {

    const count = savedCount ?? 0;

    return `

        <section class="plan-wizard plan-step-success">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-plan-import">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Plan importado</h2>

            </header>

            <div class="plan-import-success-body">

                <iconify-icon icon="solar:check-circle-bold-duotone"></iconify-icon>

                <p>${count === 1 ? "Se ha guardado 1 sesión." : `Se han guardado ${count} sesiones.`}</p>

                <p class="plan-import-success-hint">

                    Quedan guardadas en tu histórico de planes — todavía no se
                    muestran en esta pantalla, eso llega con la futura
                    conexión de Plan a los datos reales.

                </p>

            </div>

            <button class="wizard-primary-button" data-action="close-plan-import">

                Cerrar

            </button>

            ${count > 0 && savedBatchId ? `

                <button
                    class="wizard-undo-button"
                    data-action="undo-plan-import"
                    data-batch-id="${savedBatchId}"
                >

                    Deshacer esta importación

                </button>

            ` : ""}

        </section>

    `;

}

export function PlanImportWizard() {

    const step = getImportStep();

    if (step === "review") return PlanImportReviewStep(getParsedPlan(), getImportSaveError());
    if (step === "success") return PlanImportSuccessStep(getImportSavedCount(), getImportSavedBatchId());

    return PlanImportUploadStep(getImportParseError());

}
