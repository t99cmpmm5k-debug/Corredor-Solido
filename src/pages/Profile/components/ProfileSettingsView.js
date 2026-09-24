import "./ProfileSettingsView.css";

import { getBackupStatus, getDataSummary } from "../../../utils/backup.js";
import { isLoggedIn } from "../../../data/authStore.js";
import { getLastSyncAt, isSyncOffline } from "../../../data/syncManager.js";
import { BUILD_ID } from "../../../utils/buildInfo.js";

// Pantalla secundaria "Ajustes" (Perfil, rediseño 2026-09-25) -- todo lo
// técnico/mantenimiento que antes ocupaba la pantalla principal de Perfil
// (contadores de IndexedDB, sincronización, copia de seguridad, cerrar
// sesión, versión) vive ahora aquí. Mismo patrón de "pantalla secundaria"
// que RunningShoesScreen.js/ReferenceRoutesListView.js: contenido propio +
// BottomNavigation() la sigue pintando el padre (Profile.js), el cierre es
// un botón "×" propio (data-action="close-profile-settings",
// initProfileEvents.js) con su propia entrada de historial para que el
// gesto de atrás del móvil la cierre sin salir de la app.
//
// "Tema" (pedido en el encargo) NO está aquí a propósito: el selector de
// tema (mountThemeSwitcher) está desactivado en toda la app desde
// main.js ("Desactivado a propósito mientras se usa la app en real..."),
// no solo en Perfil -- añadirlo aquí reactivaría algo que se apagó a
// propósito en otro sitio, decisión aparte de este encargo.

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

// Aviso de solo-local -- en la práctica ya no debería verse (login
// obligatorio desde el plan de conexión al backend, ver main.js), pero se
// deja como red de seguridad defensiva por si el token se limpia a medio
// de una sesión antes de que el redirect a Login llegue a disparar.
function LocalOnlyNotice() {

    if (isLoggedIn()) return "";

    return `

        <div class="profile-banner profile-banner-info">

            <iconify-icon icon="solar:smartphone-bold-duotone"></iconify-icon>

            <span>Tus datos viven solo en este dispositivo y este navegador -- no hay copia en la nube. Si pierdes el móvil, cambias de navegador o desinstalas la app sin haber exportado antes, se pierden para siempre.</span>

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

function lastSyncLabel(lastSyncAt) {

    if (lastSyncAt == null) return "Todavía no se ha sincronizado con el servidor.";

    const minutesSince = Math.floor((Date.now() - new Date(lastSyncAt).getTime()) / 60000);

    if (minutesSince < 1) return "Última sincronización: hace un momento.";
    if (minutesSince < 60) return `Última sincronización: hace ${minutesSince} minuto${minutesSince === 1 ? "" : "s"}.`;

    const hoursSince = Math.floor(minutesSince / 60);
    if (hoursSince < 24) return `Última sincronización: hace ${hoursSince} hora${hoursSince === 1 ? "" : "s"}.`;

    const daysSince = Math.floor(hoursSince / 24);
    return `Última sincronización: hace ${daysSince} día${daysSince === 1 ? "" : "s"}.`;

}

function SyncCard() {

    if (!isLoggedIn()) return "";

    return `

        <section class="profile-backup-card">

            <h3>Sincronización</h3>

            <p class="profile-backup-note">

                ${lastSyncLabel(getLastSyncAt())}

            </p>

            ${isSyncOffline() ? `

                <div class="profile-banner profile-banner-info">

                    <iconify-icon icon="solar:wifi-router-minimalistic-bold-duotone"></iconify-icon>

                    <span>Sin conexión con el servidor -- se reintentará más tarde. Mientras tanto, la app sigue funcionando con lo que ya hay en este dispositivo.</span>

                </div>

            ` : ""}

            <button class="profile-button profile-button-secondary" data-action="sync-now">

                <iconify-icon icon="solar:refresh-circle-bold-duotone"></iconify-icon>

                Sincronizar ahora

            </button>

        </section>

    `;

}

// Nota estática (sin ningún control real -- Comunidad no tiene privacidad
// por usuario, ver el selector placeholder de ProfileCommunitySection en
// Profile.js) sobre cómo se manejan los datos: qué es privado de verdad
// (IndexedDB local + tu cuenta) y qué es público a propósito (Comunidad).
function PrivacyCard() {

    return `

        <section class="profile-backup-card">

            <h3>Privacidad</h3>

            <p class="profile-backup-note">

                Tus entrenos, zapatillas y demás datos se guardan en este dispositivo y se sincronizan de forma privada con tu cuenta -- nadie más los ve.

            </p>

            <p class="profile-backup-note">

                Comunidad es la excepción: es abierta para todos los usuarios registrados (tus entrenos con tu alias público, visibles para cualquiera), sin sistema de amistades ni control de quién los ve.

            </p>

        </section>

    `;

}

function DataSummaryRow(icon, label, count) {

    return `

        <div class="profile-summary-row">

            <iconify-icon icon="${icon}"></iconify-icon>

            <span class="profile-summary-label">${label}</span>

            <span class="profile-summary-value">${count}</span>

        </div>

    `;

}

// Resumen de solo lectura de lo que hay guardado en IndexedDB -- ningún
// cálculo, `summary` ya viene contado por getDataSummary() (backup.js), un
// store real = una fila. Mismos 11 stores que ahora entran en el backup
// completo -- si mañana se añade un store nuevo con datos propios del
// usuario, debería sumarse aquí Y a exportData()/importData() a la vez,
// nunca solo a uno de los dos. Reubicada aquí (antes en la pantalla
// principal de Perfil) -- técnico/debug, no algo que se consulte a diario.
function DataSummaryCard(summary) {

    return `

        <section class="profile-summary-card">

            <h3>Tus datos (técnico)</h3>

            <div class="profile-summary-list">

                ${DataSummaryRow("solar:running-bold-duotone", "Entrenos de running", summary.workouts)}

                ${DataSummaryRow("solar:dumbbell-large-bold-duotone", "Sesiones de gimnasio", summary.gymSessions)}

                ${DataSummaryRow("solar:clipboard-list-bold-duotone", "Rutinas de gimnasio", summary.gymRoutines)}

                ${DataSummaryRow("solar:scale-bold-duotone", "Registros de composición corporal", summary.bodyComposition)}

                ${DataSummaryRow("solar:plate-bold-duotone", "Alimentos registrados (nutrición)", summary.nutritionEntries)}

                ${DataSummaryRow("solar:document-text-bold-duotone", "Dietas importadas", summary.dietPlans)}

                ${DataSummaryRow("solar:checklist-minimalistic-bold-duotone", "Días con dieta marcada", summary.dietChecks)}

                ${DataSummaryRow("solar:calendar-bold-duotone", "Fines de semana elegidos (dieta)", summary.dietWeekends)}

                ${DataSummaryRow("solar:map-point-bold-duotone", "Recorridos de referencia", summary.referenceRoutes)}

                ${DataSummaryRow("solar:running-round-bold-duotone", "Zapatillas", summary.shoes)}

                ${DataSummaryRow("solar:calendar-bold-duotone", "Sesiones planificadas (Plan)", summary.plannedSessions)}

            </div>

        </section>

    `;

}

export function ProfileSettingsView(feedback) {

    const status = getBackupStatus();
    const summary = getDataSummary();

    return `

        <section class="profile-settings">

            <header class="profile-settings-header">

                <button class="profile-settings-close" data-action="close-profile-settings">

                    <iconify-icon icon="solar:close-circle-bold-duotone"></iconify-icon>

                </button>

                <h2>Ajustes y datos</h2>

            </header>

            ${LocalOnlyNotice()}

            ${BackupReminder(status)}

            ${Feedback(feedback)}

            ${SyncCard()}

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

            ${PrivacyCard()}

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

            ${DataSummaryCard(summary)}

            <p class="profile-build-id">Versión ${BUILD_ID}</p>

        </section>

    `;

}
