import "./PlanImportUploadStep.css";

export function PlanImportUploadStep(parseError) {

    return `

        <section class="plan-wizard plan-step-upload">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-plan-import">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Importar plan</h2>

            </header>

            ${parseError ? `

                <div class="wizard-banner wizard-banner-error">

                    <iconify-icon icon="solar:danger-triangle-bold-duotone"></iconify-icon>

                    <span>${parseError}</span>

                </div>

            ` : ""}

            <label class="plan-upload-trigger">

                <!-- Sin "accept": mismo motivo que en RunningUploadStep — no
                     restringir por extensión/tipo MIME, validar el contenido
                     real ya elegido en initPlanEvents.js. -->
                <input type="file" id="plan-import-file-input" hidden>

                <iconify-icon icon="solar:file-check-bold-duotone"></iconify-icon>

                <strong>Seleccionar archivo JSON, CSV o PDF</strong>

                <span>Sube un archivo .json, .csv o .pdf con tu plan de entrenamiento. El PDF debe tener texto real (no funciona con PDFs escaneados o fotografiados). Excel llegará más adelante.</span>

            </label>

        </section>

    `;

}
