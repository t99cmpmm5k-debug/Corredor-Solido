import { rerender } from "../../core/router.js";
import { addWorkout, addShoe, deleteWorkout, findSimilarWorkout, updateWorkoutType, retireShoe, updateShoe } from "../../data/workoutStore.js";
import { parseGarminScreenshots, warmUpWorker } from "../../importers/garmin-engine/recognize.js";
import { readShoePhotoAsDataUrl } from "./shoePhoto.js";
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
    setCaptures,
    setWorkout,
    getWorkout,
    updateWorkoutField,
    getSelectedShoeId,
    setSelectedShoeId,
    getAddingNewShoe,
    setAddingNewShoe,
    setSaveError,
    setSavedWorkout,
    getDuplicateWarning,
    setDuplicateWarning,
    appendTiming,
    setDetailWorkoutId,
    setTypeFilter,
    getEditingShoeId,
    setEditingShoeId,
    getNewShoePhoto,
    setNewShoePhoto
} from "./runningStore.js";

const DETAIL_HISTORY_STATE = { runningDetail: true };
const SHOES_HISTORY_STATE = { runningShoes: true };
const HISTORY_TABLE_HISTORY_STATE = { runningHistoryTable: true };

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

function openShoes() {

    // Estado limpio siempre que se entra — sin esto, quedarse a medias
    // editando/añadiendo una zapatilla y volver a entrar dejaría el
    // formulario abierto sin que el usuario haya hecho nada esta vez.
    setAddingNewShoe(false);
    setEditingShoeId(null);
    setNewShoePhoto(null);
    setWizardStep("shoes");

    history.pushState(SHOES_HISTORY_STATE, "");

    rerender();

}

function closeShoes() {

    if (history.state?.runningShoes) {
        history.back();
        return;
    }

    setWizardStep("idle");
    rerender();

}

// Pantalla propia para la tabla (ver Running.js, RunningFullTableView) —
// aislada a propósito para que girar el móvil ahí dentro no afecte a
// ninguna otra pantalla de la app.
function openHistoryTable() {

    setWizardStep("historyTable");

    history.pushState(HISTORY_TABLE_HISTORY_STATE, "");

    rerender();

}

function closeHistoryTable() {

    if (history.state?.runningHistoryTable) {
        history.back();
        return;
    }

    setWizardStep("idle");
    rerender();

}

// Registrado una sola vez a nivel de módulo (no dentro de initRunningEvents,
// que se vuelve a llamar en cada render) — si no, se acumularía un listener
// de window por cada rerender y un solo gesto de atrás cerraría estas
// pantallas varias veces de golpe.
window.addEventListener("popstate", () => {

    const step = getWizardStep();

    if (step === "detail") {
        setDetailWorkoutId(null);
        setWizardStep("idle");
        rerender();
    } else if (step === "shoes" || step === "historyTable") {
        setWizardStep("idle");
        rerender();
    }

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

const IMAGE_NAME_PATTERN = /\.(jpe?g|png|heic|heif|webp|gif|bmp)$/i;

// Safari en iOS no interpreta bien accept=".tcx" (extensiones sueltas sin
// tipo MIME estándar) — puede dejar el archivo en gris y sin poder
// seleccionarlo, aunque sea válido. En vez de perseguir qué MIME asigna
// cada plataforma a un TCX (varía, a veces ni siquiera lo asigna), el
// input ya no restringe por accept y aquí se decide por el contenido real
// del archivo, no por su nombre.
function looksLikeImage(file) {
    return file.type.startsWith("image/") || IMAGE_NAME_PATTERN.test(file.name);
}

function looksLikeTcx(text) {
    return /^\s*<\?xml/i.test(text) && text.includes("TrainingCenterDatabase");
}

// Un .tcx es un archivo de actividad ya completo por sí solo (a
// diferencia de las capturas, que necesitan varias para fusionarse) —
// no pasa por Tesseract ni por el paso "processing", el parseo XML es
// instantáneo. Selección múltiple sigue yendo siempre por capturas.
async function handleTcxFileSelected(xmlText) {

    setOcrError(null);
    setParseError(null);

    try {

        const workout = importWorkout("tcx", xmlText);

        setWorkout(workout);
        setWizardStep("review");

    } catch (err) {

        setParseError(err.message);

    }

    rerender();

}

// Con un solo archivo que no es reconocible como imagen (captura), se lee
// su contenido para decidir: si es un TCX válido se importa directo; si
// no, se avisa con claridad en vez de intentar el OCR sobre algo que no
// es una captura — mejor eso que un fallo confuso dentro de Tesseract.
async function handleSingleNonImageFile(file) {

    setOcrError(null);
    setParseError(null);

    let text;

    try {
        text = await file.text();
    } catch {
        setParseError(`No se pudo leer "${file.name}".`);
        rerender();
        return;
    }

    if (looksLikeTcx(text)) {
        return handleTcxFileSelected(text);
    }

    setParseError(`"${file.name}" no es un archivo compatible — sube una captura de pantalla o un .tcx exportado desde tu reloj.`);
    rerender();

}

async function handleFilesSelected(fileList) {

    const files = [...(fileList || [])];
    if (!files.length) return;

    if (files.length === 1 && !looksLikeImage(files[0])) {
        return handleSingleNonImageFile(files[0]);
    }

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

    // Se guarda para el desplegable "Ver texto OCR" de la pantalla de
    // revisión — sin esto, diagnosticar un fallo de parsing en real exige
    // devtools en el móvil, que no es una opción real ahí.
    setCaptures(captures);

    // TEMPORAL - para depurar el bug de FC máxima con datos de la
    // ejecución real en vez de texto reconstruido a mano. Quitar en
    // cuanto se cierre ese bug.
    // JSON.stringify en vez del objeto suelto: en consola móvil (captura
    // de pantalla) un objeto colapsado no se puede expandir para copiarlo.
    console.log("[DEBUG maxHR] por captura:", JSON.stringify(captures.map(c => ({
        file: c.file,
        screen: c.parsed.screen.type,
        max: c.parsed.data.max_heart_rate_bpm,
        avg: c.parsed.data.avg_heart_rate_bpm
    })), null, 2));
    console.log("[DEBUG maxHR] fusionado:", JSON.stringify(merged.fields.max_heart_rate_bpm, null, 2));

    // TEMPORAL - mismo motivo que el bloque de arriba, para el bug de
    // fecha/hora no detectadas. Quitar en cuanto se cierre ese bug.
    console.log("[DEBUG date] por captura:", JSON.stringify(captures.map(c => ({
        file: c.file,
        screen: c.parsed.screen.type,
        date: c.parsed.data.date,
        time: c.parsed.data.time,
        rawDate: c.parsed.fields.date?.source,
        rawTime: c.parsed.fields.time?.source
    })), null, 2));
    console.log("[DEBUG date] fusionado:", JSON.stringify({
        date: merged.fields.date,
        time: merged.fields.time
    }, null, 2));

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

    document.querySelectorAll('[data-action="filter-by-type"]').forEach(button => {

        button.addEventListener("click", () => {
            setTypeFilter(button.dataset.type || null);
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

    document.querySelectorAll('[data-action="open-shoes"]').forEach(button => {

        button.addEventListener("click", openShoes);

    });

    document.querySelectorAll('[data-action="close-shoes"]').forEach(button => {

        button.addEventListener("click", closeShoes);

    });

    document.querySelectorAll('[data-action="open-history-table"]').forEach(button => {

        button.addEventListener("click", openHistoryTable);

    });

    document.querySelectorAll('[data-action="close-history-table"]').forEach(button => {

        button.addEventListener("click", closeHistoryTable);

    });

    // Compartido por el formulario de alta y el de edición — solo uno de
    // los dos está abierto a la vez, así que un único hueco en el store
    // para "la foto que se acaba de elegir" basta.
    document.querySelectorAll(".shoe-photo-input").forEach(input => {

        input.addEventListener("change", async () => {

            const file = input.files?.[0];
            if (!file) return;

            try {
                const dataUrl = await readShoePhotoAsDataUrl(file);
                setNewShoePhoto(dataUrl);
                rerender();
            } catch {
                // Sin bloqueo si falla leer la imagen — la zapatilla se
                // puede guardar igual sin foto.
            }

        });

    });

    document.querySelectorAll('[data-action="open-add-shoe-form"]').forEach(button => {

        button.addEventListener("click", () => {
            setAddingNewShoe(true);
            setEditingShoeId(null);
            setNewShoePhoto(null);
            rerender();
        });

    });

    document.querySelectorAll('[data-action="cancel-add-shoe"]').forEach(button => {

        button.addEventListener("click", () => {
            setAddingNewShoe(false);
            setNewShoePhoto(null);
            rerender();
        });

    });

    document.querySelectorAll('[data-action="add-shoe"]').forEach(button => {

        button.addEventListener("click", () => {

            const brand = document.querySelector('.shoes-add-form [data-shoe-field="brand"]')?.value.trim();
            const model = document.querySelector('.shoes-add-form [data-shoe-field="model"]')?.value.trim();

            if (!brand || !model) return;

            const lifetimeKmRaw = document.querySelector('.shoes-add-form [data-shoe-field="lifetimeKm"]')?.value;
            const lifetimeKm = lifetimeKmRaw ? Number(lifetimeKmRaw) : null;

            addShoe({
                brand,
                model,
                photo: getNewShoePhoto(),
                lifetimeKm: Number.isFinite(lifetimeKm) && lifetimeKm > 0 ? lifetimeKm : null
            });

            setAddingNewShoe(false);
            setNewShoePhoto(null);
            rerender();

        });

    });

    document.querySelectorAll('[data-action="edit-shoe"]').forEach(button => {

        button.addEventListener("click", () => {

            const id = button.dataset.shoeId;

            setEditingShoeId(getEditingShoeId() === id ? null : id);
            setAddingNewShoe(false);
            setNewShoePhoto(null);
            rerender();

        });

    });

    document.querySelectorAll('[data-action="save-shoe-edit"]').forEach(button => {

        button.addEventListener("click", () => {

            const id = button.dataset.shoeId;
            const lifetimeKmRaw = document.querySelector('.shoe-edit-form [data-shoe-field="lifetimeKm"]')?.value;
            const lifetimeKm = lifetimeKmRaw ? Number(lifetimeKmRaw) : null;

            const patch = { lifetimeKm: Number.isFinite(lifetimeKm) && lifetimeKm > 0 ? lifetimeKm : null };

            // Solo se pisa la foto si se eligió una nueva en esta edición —
            // si no, la zapatilla conserva la que ya tenía.
            const photo = getNewShoePhoto();
            if (photo) patch.photo = photo;

            updateShoe(id, patch);

            setEditingShoeId(null);
            setNewShoePhoto(null);
            rerender();

        });

    });

    document.querySelectorAll('[data-action="retire-shoe"]').forEach(button => {

        button.addEventListener("click", () => {
            retireShoe(button.dataset.shoeId);
            rerender();
        });

    });

    document.querySelectorAll('[data-action="reactivate-shoe"]').forEach(button => {

        button.addEventListener("click", () => {
            updateShoe(button.dataset.shoeId, { status: "active", retiredDate: null });
            rerender();
        });

    });

}
