import "./GymImportUploadStep.css";

export function GymImportUploadStep(parseError) {

    return `

        <section class="gym-wizard wizard-step-upload">

            <header class="wizard-header">

                <button class="wizard-close" data-action="close-gym-import">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Importar rutina</h2>

            </header>

            ${parseError ? `

                <div class="wizard-banner wizard-banner-error">

                    <iconify-icon icon="solar:danger-triangle-bold-duotone"></iconify-icon>

                    <span>${parseError}</span>

                </div>

            ` : ""}

            <label class="gym-upload-trigger">

                <!-- Sin "accept": mismo motivo que PlanImportUploadStep — solo
                     se acepta PDF por ahora, se valida leyendo el contenido
                     real en initGymEvents.js, no por extensión. -->
                <input type="file" id="gym-import-file-input" hidden>

                <iconify-icon icon="solar:file-check-bold-duotone"></iconify-icon>

                <strong>Seleccionar PDF de tu rutina</strong>

                <span>Sube un PDF con tabla de Ejercicio/Series/Reps/Peso por día. Debe tener texto real (no funciona con PDFs escaneados o fotografiados).</span>

            </label>

        </section>

    `;

}
