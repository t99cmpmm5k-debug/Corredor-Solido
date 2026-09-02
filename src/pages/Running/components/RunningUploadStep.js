import "./RunningUploadStep.css";

export function RunningUploadStep({ progress, ocrError, parseError, timingLog }) {

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

                    <!-- Sin "accept": Safari en iOS no interpreta bien extensiones
                         sueltas como ".tcx"/".gpx" (sin tipo MIME estándar) y puede
                         dejar el archivo válido en gris, sin poder seleccionarlo. Se
                         valida el contenido real ya elegido en initRunningEvents.js
                         en vez de restringir aquí qué se puede ni siquiera tocar. -->
                    <input type="file" id="running-file-input" multiple hidden>

                    <iconify-icon icon="solar:gallery-add-bold-duotone"></iconify-icon>

                    <strong>Seleccionar capturas o archivo TCX/GPX</strong>

                    <span>Sube una o varias capturas del mismo entrenamiento (Resumen, Estadísticas, Vueltas...) o un único archivo .tcx/.gpx exportado desde tu reloj/app (Amazfit, Garmin Connect, Strava, etc.). Para ver la FC por vuelta en el gráfico, en Vueltas desliza la tabla a la derecha hasta la columna "Frecuencia cardíaca media" antes de capturar — si no, el gráfico mostrará solo la FC media del entreno.</span>

                </label>

            `}

            ${timingLog?.length ? `

                <!-- TEMPORAL - mientras se mide el rendimiento del OCR, quitar luego -->
                <div class="upload-timing-log">

                    <p class="upload-timing-log-title">Tiempos (temporal, para medir)</p>

                    ${timingLog.map(line => `<div>${line}</div>`).join("")}

                </div>

            ` : ""}

        </section>

    `;

}
