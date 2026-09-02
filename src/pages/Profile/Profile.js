import "./Profile.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { getBackupStatus } from "../../utils/backup.js";
import { getFeedback } from "./profileStore.js";
import { BUILD_ID } from "../../utils/buildInfo.js";

// TEMPORAL - QUITAR CUANDO SE CIERRE EL DIAGNÓSTICO DE ACWR (ver AcwrDataCheck.js)
import { AcwrDataCheckCard } from "../../dev/AcwrDataCheck.js";

function BackupReminder(status) {

    if (!status.shouldRemind) return "";

    const text = status.daysSinceExport == null
        ? "Todavía no has exportado ninguna copia de tus datos."
        : `Hace ${status.daysSinceExport} días que no exportas tus datos.`;

    return `

        <div class="profile-banner profile-banner-warning">

            <iconify-icon icon="solar:danger-circle-bold-duotone"></iconify-icon>

            <span>${text} Exporta una copia para no perderlos si cambias de móvil o desinstalas la app.</span>

        </div>

    `;

}

function Feedback(feedback) {

    if (!feedback) return "";

    const icon = feedback.type === "success"
        ? "solar:check-circle-bold-duotone"
        : "solar:danger-triangle-bold-duotone";

    return `

        <div class="profile-banner profile-banner-${feedback.type}">

            <iconify-icon icon="${icon}"></iconify-icon>

            <span>${feedback.text}</span>

        </div>

    `;

}

function lastExportLabel(daysSinceExport) {

    if (daysSinceExport == null) return "Nunca has exportado una copia.";
    if (daysSinceExport === 0) return "Última copia: hoy.";

    return `Última copia: hace ${daysSinceExport} día${daysSinceExport === 1 ? "" : "s"}.`;

}

export function Profile() {

    const status = getBackupStatus();
    const feedback = getFeedback();

    return `

        <div class="profile">

            <div class="profile-content">

                <header class="profile-header">

                    <h1>Perfil</h1>

                </header>

                <p class="profile-placeholder-note">

                    Todavía no hay una pantalla de perfil de verdad — de momento aquí solo vive la copia de seguridad.

                </p>

                ${BackupReminder(status)}

                ${Feedback(feedback)}

                <section class="profile-backup-card">

                    <h3>Copia de seguridad</h3>

                    <p class="profile-backup-note">

                        ${lastExportLabel(status.daysSinceExport)}

                    </p>

                    <button class="profile-button profile-button-primary" data-action="export-backup">

                        <iconify-icon icon="solar:download-minimalistic-bold-duotone"></iconify-icon>

                        Exportar mis datos

                    </button>

                    <label class="profile-button profile-button-secondary">

                        <!-- Sin "accept": Safari en iOS no interpreta bien
                             accept="application/json" de forma consistente entre
                             versiones y puede dejar el archivo válido en gris, sin
                             poder seleccionarlo (mismo motivo que en
                             PlanImportUploadStep/RunningUploadStep). Se valida el
                             contenido real (JSON.parse) ya elegido en
                             importDataFromFile()/backup.js en vez de restringir
                             aquí qué se puede ni siquiera tocar. -->
                        <input type="file" id="profile-import-input" hidden>

                        <iconify-icon icon="solar:upload-minimalistic-bold-duotone"></iconify-icon>

                        Importar copia

                    </label>

                    <p class="profile-backup-hint">

                        Importar fusiona los datos del archivo con los que ya tienes en este dispositivo — no borra nada.

                    </p>

                </section>

                ${AcwrDataCheckCard()}

                <p class="profile-build-id">Versión ${BUILD_ID}</p>

            </div>

            ${BottomNavigation()}

        </div>

    `;

}
