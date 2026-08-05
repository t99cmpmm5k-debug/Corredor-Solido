import "./RunningUploadStep.css";

export function RunningUploadStep({ progress, ocrError, parseError }) {

    return `

        <section class="running-wizard running-step-upload">

            <header class="wizard-header">

                <button class="wizard-close" data-action="cancel-wizard">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Importar entrenamiento</h2>

            </header>

            ${ocrError ? `

                <div class="wizard-banner wizard-banner-error">

                    <iconify-icon icon="solar:danger-triangle-bold-duotone"></iconify-icon>

                    <span>No se pudo leer las capturas: ${ocrError}. Inténtalo de nuevo.</span>

                </div>

            ` : ""}

            ${parseError ? `

                <div class="wizard-banner wizard-banner-error">

                    <iconify-icon icon="solar:danger-triangle-bold-duotone"></iconify-icon>

                    <span>${parseError}</span>

                </div>

            ` : ""}

            ${progress ? `

                <div class="upload-progress">

                    <iconify-icon icon="solar:round-alt-arrow-right-bold-duotone" class="upload-progress-spinner"></iconify-icon>

                    <p class="upload-progress-status">

                        Captura ${progress.fileIndex + 1}/${progress.totalFiles} · ${progress.message || "Leyendo"}

                    </p>

                    <div class="upload-progress-bar">

                        <div class="upload-progress-bar-fill" style="--progress:${Math.round((progress.fraction || 0) * 100)}%"></div>

                    </div>

                    <p class="upload-progress-hint">

                        Puede tardar unos segundos por captura, no se ha quedado colgado.

                    </p>

                </div>

            ` : `

                <label class="upload-trigger">

                    <input type="file" id="running-file-input" accept="image/*" multiple hidden>

                    <iconify-icon icon="solar:gallery-add-bold-duotone"></iconify-icon>

                    <strong>Seleccionar capturas</strong>

                    <span>Sube una o varias capturas del mismo entrenamiento (Resumen, Estadísticas...)</span>

                </label>

            `}

        </section>

    `;

}
