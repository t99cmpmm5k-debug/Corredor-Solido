import { rerender } from "../../core/router.js";
import { addWorkout, addShoe, deleteWorkout, findSimilarWorkout } from "../../data/workoutStore.js";
import { parseGarminScreenshots } from "../../importers/garmin-engine/recognize.js";
import { importWorkout } from "../../importers/index.js";
import { REVIEW_FIELDS, parseFieldValue } from "./components/RunningReviewStep.js";

import {
    resetWizard,
    setWizardStep,
    setFiles,
    setProgress,
    setOcrError,
    setParseError,
    setWorkout,
    getWorkout,
    updateWorkoutField,
    getSelectedShoeId,
    setSelectedShoeId,
    setAddingNewShoe,
    setSaveError,
    setSavedWorkout,
    getDuplicateWarning,
    setDuplicateWarning
} from "./runningStore.js";

function performSave() {

    const workout = getWorkout();
    if (!workout) return;

    try {

        const saved = addWorkout({ ...workout, shoeId: getSelectedShoeId() });
        setSavedWorkout(saved);
        resetWizard();

    } catch (err) {

        setSaveError(err.message);

    }

    rerender();

}

async function handleFilesSelected(fileList) {

    const files = [...(fileList || [])];
    if (!files.length) return;

    setFiles(files);
    setOcrError(null);
    setParseError(null);
    setProgress({ fileIndex: 0, totalFiles: files.length, fraction: 0, message: "Preparando" });
    setWizardStep("processing");
    rerender();

    // El logger de Tesseract dispara muy seguido — se guarda cada tick,
    // pero solo se repinta cada 200ms (o al llegar al 100% de una
    // captura) para no lanzar un render completo docenas de veces/seg.
    let lastRenderAt = 0;

    const onProgress = (fileIndex, totalFiles, fraction, message) => {

        setProgress({ fileIndex, totalFiles, fraction, message });

        const now = performance.now();
        if (fraction >= 1 || now - lastRenderAt >= 200) {
            lastRenderAt = now;
            rerender();
        }

    };

    let merged, captures;

    try {
        ({ merged, captures } = await parseGarminScreenshots(files, onProgress));
    } catch (err) {
        setOcrError(err.message);
        setWizardStep("upload");
        rerender();
        return;
    }

    // No todas las capturas subidas tienen por qué ser Resumen/Estadísticas
    // (Training Effect, Vueltas, capturas de más...) — el motor las ignora
    // para no meter basura en la fusión, pero hay que decírselo al usuario,
    // no dejar que se pregunte por qué faltan datos en silencio.
    const unrecognized = captures.filter(c => c.parsed.screen.type === "unknown");

    try {

        const workout = importWorkout("garmin", merged);

        if (unrecognized.length > 0) {
            workout.importWarnings = [
                `${unrecognized.length} de ${captures.length} captura(s) no se reconocieron como Resumen o Estadísticas y no se usaron: ${unrecognized.map(c => c.file).join(", ")}.`,
                ...workout.importWarnings
            ];
        }

        setWorkout(workout);
        setWizardStep("review");

    } catch (err) {
        setParseError(err.message);
        setWizardStep("upload");
    }

    rerender();

}

export function initRunningEvents() {

    document.querySelectorAll('[data-action="open-wizard"]').forEach(button => {

        button.addEventListener("click", () => {
            resetWizard();
            setWizardStep("upload");
            rerender();
        });

    });

    const fileInput = document.querySelector("#running-file-input");

    if (fileInput) {

        fileInput.addEventListener("change", () => {
            handleFilesSelected(fileInput.files);
        });

    }

    document.querySelectorAll('[data-action="cancel-wizard"]').forEach(button => {

        button.addEventListener("click", () => {
            resetWizard();
            rerender();
        });

    });

    document.querySelectorAll(".review-fields [data-field]").forEach(input => {

        input.addEventListener("change", () => {

            const field = REVIEW_FIELDS.find(f => f.key === input.dataset.field);

            updateWorkoutField(field.key, parseFieldValue(field, input.value));
            rerender();

        });

    });

    document.querySelectorAll('[data-action="go-to-shoe"]').forEach(button => {

        button.addEventListener("click", () => {
            setWizardStep("shoe");
            rerender();
        });

    });

    document.querySelectorAll('[data-action="select-shoe"]').forEach(button => {

        button.addEventListener("click", () => {

            const id = button.dataset.shoeId;
            setSelectedShoeId(getSelectedShoeId() === id ? null : id);
            rerender();

        });

    });

    document.querySelectorAll('[data-action="toggle-add-shoe"]').forEach(button => {

        button.addEventListener("click", () => {
            setAddingNewShoe(true);
            rerender();
        });

    });

    document.querySelectorAll('[data-action="save-new-shoe"]').forEach(button => {

        button.addEventListener("click", () => {

            const brand = document.querySelector('[data-shoe-field="brand"]')?.value.trim();
            const model = document.querySelector('[data-shoe-field="model"]')?.value.trim();

            if (!brand || !model) return;

            const shoe = addShoe({ brand, model });

            setSelectedShoeId(shoe.id);
            setAddingNewShoe(false);
            rerender();

        });

    });

    document.querySelectorAll('[data-action="save-workout"]').forEach(button => {

        button.addEventListener("click", () => {

            const workout = getWorkout();
            if (!workout) return;

            const existing = findSimilarWorkout(workout.date, workout.distanceKm, workout.durationSec);

            if (existing) {
                setDuplicateWarning(existing);
                rerender();
                return;
            }

            performSave();

        });

    });

    document.querySelectorAll('[data-action="replace-duplicate"]').forEach(button => {

        button.addEventListener("click", () => {

            const existing = getDuplicateWarning();
            if (existing) deleteWorkout(existing.id);

            setDuplicateWarning(null);
            performSave();

        });

    });

    document.querySelectorAll('[data-action="save-anyway"]').forEach(button => {

        button.addEventListener("click", () => {
            setDuplicateWarning(null);
            performSave();
        });

    });

    document.querySelectorAll('[data-action="cancel-duplicate"]').forEach(button => {

        button.addEventListener("click", () => {
            setDuplicateWarning(null);
            rerender();
        });

    });

    // TODO: sustituir este confirm() nativo por el patrón "pulsa otra vez
    // para confirmar" dentro de la propia fila — pendiente a propósito,
    // ver nota en Running.css junto a .history-delete.
    document.querySelectorAll('[data-action="delete-workout"]').forEach(button => {

        button.addEventListener("click", () => {

            if (!window.confirm("¿Borrar este entrenamiento? No se puede deshacer.")) return;

            deleteWorkout(button.dataset.workoutId);
            rerender();

        });

    });

}
