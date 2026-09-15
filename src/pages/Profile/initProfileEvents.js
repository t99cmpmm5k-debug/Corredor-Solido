import { navigate, rerender } from "../../core/router.js";
import { exportData, importDataFromFile } from "../../utils/backup.js";
import { setFeedback } from "./profileStore.js";
import { clearToken } from "../../data/authStore.js";
import { runSync } from "../../data/syncManager.js";
import { Login } from "../Auth/Auth.js";

function handleExport() {

    exportData()
        .then(() => {
            setFeedback({ type: "success", text: "Copia exportada correctamente." });
            rerender();
        })
        .catch(() => {
            setFeedback({ type: "error", text: "No se pudo exportar la copia." });
            rerender();
        });

}

function handleImportFile(file) {

    importDataFromFile(file)
        .then(() => {
            setFeedback({ type: "success", text: "Copia importada — se ha fusionado con lo que ya tenías." });
            rerender();
        })
        .catch(err => {
            setFeedback({ type: "error", text: err.message || "No se pudo leer el archivo de copia." });
            rerender();
        });

}

// runSync() nunca rechaza (se traga sus propios errores para no dejar
// fuera de la app a quien ya tiene sesión válida, ver syncManager.js) --
// por eso el feedback aquí se decide por el status que devuelve, no por
// then/catch.
const SYNC_STATUS_FEEDBACK = {
    ok: { type: "success", text: "Sincronizado correctamente." },
    offline: { type: "error", text: "Sin conexión con el servidor -- se reintentará más tarde." },
    error: { type: "error", text: "No se pudo sincronizar. Se reintentará más tarde." },
    busy: { type: "success", text: "Ya había una sincronización en curso -- se ha completado." }
};

function handleSyncNow() {

    setFeedback(null);
    rerender();

    runSync("manual").then(status => {

        // "unauthorized" ya lo resuelve runSync() por su cuenta
        // (clearToken() + navigate(Login), ver syncManager.js) -- para
        // cuando la promesa resuelve ya estamos en otra pantalla, así que
        // no hay banner de Perfil que mostrar ni falta re-renderizar aquí.
        if (status === "unauthorized") return;

        setFeedback(SYNC_STATUS_FEEDBACK[status] || null);
        rerender();

    });

}

export function initProfileEvents() {

    const syncButton = document.querySelector('[data-action="sync-now"]');

    if (syncButton) {
        syncButton.addEventListener("click", handleSyncNow);
    }

    const logoutButton = document.querySelector('[data-action="logout"]');

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            clearToken();
            navigate(Login);
        });
    }

    const exportButton = document.querySelector('[data-action="export-backup"]');

    if (exportButton) {
        exportButton.addEventListener("click", () => {
            setFeedback(null);
            handleExport();
        });
    }

    const importInput = document.querySelector("#profile-import-input");

    if (importInput) {

        importInput.addEventListener("change", () => {

            const file = importInput.files?.[0];
            importInput.value = "";

            if (!file) return;

            setFeedback(null);
            handleImportFile(file);

        });

    }

}
