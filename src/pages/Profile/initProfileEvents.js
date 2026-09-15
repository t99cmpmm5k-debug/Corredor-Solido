import { navigate, rerender } from "../../core/router.js";
import { exportData, importDataFromFile, getSyncableData } from "../../utils/backup.js";
import { setFeedback } from "./profileStore.js";
import { clearToken, getToken } from "../../data/authStore.js";
import { pushSync } from "../../data/syncApi.js";
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

function handlePushSync() {

    const token = getToken();
    if (!token) return;

    setFeedback(null);
    rerender();

    pushSync(getSyncableData(), token)
        .then(() => {
            setFeedback({ type: "success", text: "Historial subido correctamente." });
            rerender();
        })
        .catch(err => {
            setFeedback({ type: "error", text: err.message || "No se pudo subir el historial." });
            rerender();
        });

}

export function initProfileEvents() {

    const pushSyncButton = document.querySelector('[data-action="push-sync"]');

    if (pushSyncButton) {
        pushSyncButton.addEventListener("click", handlePushSync);
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
