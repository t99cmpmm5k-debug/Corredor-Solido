import { rerender } from "../../core/router.js";
import { addWorkout, addShoe, deleteWorkout, findSimilarWorkout, updateWorkoutType } from "../../data/workoutStore.js";
import { parseGarminScreenshots, warmUpWorker } from "../../importers/garmin-engine/recognize.js";
import { importWorkout } from "../../importers/index.js";
import { REVIEW_FIELDS, parseFieldValue } from "./components/RunningReviewStep.js";

import {
    resetWizard,
    getWizardStep,
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
    setDuplicateWarning,
    appendTiming,
    setDetailWorkoutId
} from "./runningStore.js";

const DETAIL_HISTORY_STATE = { runningDetail: true };

function openDetail(workoutId) {

    setDetailWorkoutId(workoutId);
    setWizardStep("detail");

    // Sin esto, el gesto de atrás del móvil no tiene una entrada de
    // historial propia que consumir y se sale directo de la app.
    history.pushState(DETAIL_HISTORY_STATE, "");

    rerender();

}

function closeDetail() {

    // Si el detalle se abrió con pushState, retroceder por ahí dispara
    // handlePopState() y hace lo mismo que este botón — así el gesto de
    // atrás y la X quedan sincronizados y no dejan una entrada fantasma.
    if (history.state?.runningDetail) {
        history.back();
        return;
    }

    setDetailWorkoutId(null);
    setWizardStep("idle");
    rerender();

}

// Registrado una sola vez a nivel de módulo (no dentro de initRunningEvents,
// que se vuelve a llamar en cada render) — si no, se acumularía un listener
// de window por cada rerender y un solo gesto de atrás cerraría el detalle
// varias veces de golpe.
window.addEventListener("popstate", () => {

    if (getWizardStep() !== "detail") return;

    setDetailWorkoutId(null);
    setWizardStep("idle");
    rerender();

});

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

    // TEMPORAL - MIENTRAS SE MIDE EL RENDIMIENTO DEL OCR, QUITAR LUEGO.
    // En pantalla porque conectar el móvil a Safari/Chrome DevTools para
    // mirar la consola no es una opción real aquí.
    const onTiming = (line) => {
        appendTiming(line);
        rerender();
    };

    let merged, captures;

    try {
        ({ merged, captures } = await parseGarminScreenshots(files, onProgress, onTiming));
    } catch (err) {
        setOcrError(err.message);
        setProgress(null);
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
        setProgress(null);
        setWizardStep("upload");
    }

    rerender();

}

export function initRunningEvents() {

    // Arranca el worker de Tesseract en cuanto se entra en Running, no al
    // pulsar Importar — warmUpWorker() memoiza, así que en renders
    // sucesivos dentro de la misma página no hace nada de más.
    if (document.querySelector(".running")) {
        warmUpWorker();
    }

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

    document.querySelectorAll('[data-action="back-to-review"]').forEach(button => {

        button.addEventListener("click", () => {
            setSaveError(null);
            setWizardStep("review");
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

            if (!workout.date) {
                setSaveError("Falta la fecha del entrenamiento — vuelve a Revisar y rellénala.");
                rerender();
                return;
            }

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

        button.addEventListener("click", (event) => {

            // La fila entera abre el detalle (ver [data-action="open-detail"]
            // más abajo) — sin esto, borrar también abriría el detalle.
            event.stopPropagation();

            if (!window.confirm("¿Borrar este entrenamiento? No se puede deshacer.")) return;

            deleteWorkout(button.dataset.workoutId);
            rerender();

        });

    });

    document.querySelectorAll('[data-action="open-detail"]').forEach(article => {

        article.addEventListener("click", () => {
            openDetail(article.dataset.workoutId);
        });

    });

    document.querySelectorAll('[data-action="close-detail"]').forEach(button => {

        button.addEventListener("click", closeDetail);

    });

    document.querySelectorAll('[data-action="set-workout-type"]').forEach(select => {

        select.addEventListener("change", () => {

            updateWorkoutType(select.dataset.workoutId, select.value);
            rerender();

        });

    });

}
