import { rerender } from "../../core/router.js";
import { exportData, importDataFromFile } from "../../utils/backup.js";
import { setFeedback } from "./profileStore.js";

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

export function initProfileEvents() {

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
