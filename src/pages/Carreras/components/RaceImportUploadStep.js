import "./RaceImportUploadStep.css";

export function RaceImportUploadStep(parseError) {

    return `

        <section class="carreras-wizard race-step-upload">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-race-import">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Importar carreras</h2>

            </header>

            ${parseError ? `

                <div class="wizard-banner wizard-banner-error">

                    <iconify-icon icon="solar:danger-triangle-bold-duotone"></iconify-icon>

                    <span>${parseError}</span>

                </div>

            ` : ""}

            <label class="race-upload-trigger">

                <!-- Sin "accept": mismo motivo que PlanImportUploadStep.js —
                     no restringir por extensión/tipo MIME. -->
                <input type="file" id="race-import-file-input" hidden>

                <iconify-icon icon="solar:flag-2-bold-duotone"></iconify-icon>

                <strong>Seleccionar archivo JSON</strong>

                <span>Sube un archivo .json con tu calendario de carreras.</span>

            </label>

        </section>

    `;

}
