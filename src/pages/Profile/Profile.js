import "./Profile.css";

import { BottomNavigation } from "../../components/Navigation/BottomNavigation.js";
import { getBackupStatus, getDataSummary } from "../../utils/backup.js";
import { getFeedback } from "./profileStore.js";
import { isLoggedIn } from "../../data/authStore.js";
import { BUILD_ID } from "../../utils/buildInfo.js";

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

// Aviso de solo-local (Perfil, Capa 3) -- siempre visible, tono
// informativo (icono/color neutros, NUNCA el amber de BackupReminder) --
// no es una alerta de algo que ya ha ido mal, es contexto permanente sobre
// cómo funciona el almacenamiento de la app (ver CLAUDE.md: IndexedDB,
// sin sincronización en la nube).
function LocalOnlyNotice() {

    return `

        <div class="profile-banner profile-banner-info">

            <iconify-icon icon="solar:smartphone-bold-duotone"></iconify-icon>

            <span>Tus datos viven solo en este dispositivo y este navegador -- no hay copia en la nube. Si pierdes el móvil, cambias de navegador o desinstalas la app sin haber exportado antes, se pierden para siempre.</span>

        </div>

    `;

}

// Fila de "TUS DATOS" -- icono/etiqueta/número, misma lectura que
// .running-summary-item o .shoe-mileage-row, pero en lista vertical (no en
// fila) porque aquí son 5 valores, no 3-4, y una fila los dejaría
// demasiado apretados en un móvil estrecho.
function DataSummaryRow(icon, label, count) {

    return `

        <div class="profile-summary-row">

            <iconify-icon icon="${icon}"></iconify-icon>

            <span class="profile-summary-label">${label}</span>

            <span class="profile-summary-value">${count}</span>

        </div>

    `;

}

// Resumen de solo lectura de lo que hay guardado en IndexedDB (Perfil,
// Capa 3) -- ningún cálculo, `summary` ya viene contado por
// getDataSummary() (backup.js), un store real = una fila. Mismos 5 stores
// que ahora entran en el backup completo (ver el fix de gymSessions en
// backup.js) -- si mañana se añade un store nuevo con datos propios del
// usuario, debería sumarse aquí Y a exportData()/importData() a la vez,
// nunca solo a uno de los dos.
function DataSummaryCard(summary) {

    return `

        <section class="profile-summary-card">

            <h3>Tus datos</h3>

            <div class="profile-summary-list">

                ${DataSummaryRow("solar:running-bold-duotone", "Entrenos de running", summary.workouts)}

                ${DataSummaryRow("solar:dumbbell-large-bold-duotone", "Sesiones de gimnasio", summary.gymSessions)}

                ${DataSummaryRow("solar:map-point-bold-duotone", "Recorridos de referencia", summary.referenceRoutes)}

                ${DataSummaryRow("solar:running-round-bold-duotone", "Zapatillas", summary.shoes)}

                ${DataSummaryRow("solar:calendar-bold-duotone", "Sesiones planificadas (Plan)", summary.plannedSessions)}

            </div>

        </section>

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

// Sube el histórico local al servidor bajo demanda -- el único momento
// automático (justo tras verificar la cuenta, ver initVerifyAccount() en
// pages/Auth/initAuthEvents.js) puede acabar disparándose desde un
// contexto de almacenamiento distinto (Safari normal vs. la PWA
// instalada -- iOS aísla el storage entre los dos) y subir un histórico
// vacío sin que quien lo sufre tenga forma de saberlo ni de reintentarlo.
// Este botón es ese reintento manual: solo tiene sentido con sesión
// iniciada (pushSync() necesita token).
function SyncCard() {

    if (!isLoggedIn()) return "";

    return `

        <section class="profile-backup-card">

            <h3>Sincronización</h3>

            <p class="profile-backup-note">

                Sube una copia de tus datos locales al servidor de tu cuenta.

            </p>

            <button class="profile-button profile-button-secondary" data-action="push-sync">

                <iconify-icon icon="solar:cloud-upload-bold-duotone"></iconify-icon>

                Subir mi historial ahora

            </button>

        </section>

    `;

}

export function Profile() {

    const status = getBackupStatus();
    const feedback = getFeedback();
    const summary = getDataSummary();

    return `

        <div class="profile">

            <div class="profile-content">

                <header class="profile-header">

                    <h1>Perfil</h1>

                </header>

                <p class="profile-placeholder-note">

                    Todavía no hay una pantalla de perfil completa (ajustes, tema...) — de momento aquí vive un resumen de tus datos y la copia de seguridad.

                </p>

                ${DataSummaryCard(summary)}

                ${LocalOnlyNotice()}

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

                ${SyncCard()}

                <section class="profile-backup-card">

                    <h3>Sesión</h3>

                    <button class="profile-button profile-button-danger" data-action="logout">

                        <iconify-icon icon="solar:logout-2-bold-duotone"></iconify-icon>

                        Cerrar sesión

                    </button>

                    <p class="profile-backup-hint">

                        Solo cierra la sesión de sincronización -- tus datos siguen guardados en este dispositivo.

                    </p>

                </section>

                <p class="profile-build-id">Versión ${BUILD_ID}</p>

            </div>

            ${BottomNavigation()}

        </div>

    `;

}
