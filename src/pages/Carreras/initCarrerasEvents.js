import { rerender, navigate } from "../../core/router.js";
import { openDetail as openRunningDetail } from "../Running/initRunningEvents.js";
import { Running } from "../Running/Running.js";

import {
    setActiveTab,
    setSearchQuery,
    setSelectedRegion,
    setSelectedType,
    getSelectedPlannedRaceId,
    setSelectedPlannedRaceId
} from "./carrerasStore.js";

import { importRaces } from "../../importers/races/index.js";
import { getPlannedRaces, importPlannedRaces, deletePlannedRacesByBatch, deletePlannedRace } from "../../data/workoutStore.js";
import { RACE_REVIEW_FIELDS, parseRaceFieldValue } from "./components/RaceImportReviewStep.js";

import {
    getRaceImportStep,
    setRaceImportStep,
    resetRaceImport,
    getParsedRaces,
    setParsedRaces,
    setRaceImportParseError,
    setRaceImportSaveError,
    setRaceImportSavedCount,
    setRaceImportSavedBatchId,
    updateImportRaceField
} from "./raceImportStore.js";

const RACE_IMPORT_HISTORY_STATE = { raceImport: true };
const RACE_DETAIL_HISTORY_STATE = { raceDetail: true };

function selectTab(tab) {

    setActiveTab(tab);
    rerender();

}

function selectRegion(region) {

    setSelectedRegion(region);
    rerender();

}

function selectType(type) {

    setSelectedType(type);
    rerender();

}

// Una completada de verdad salta al detalle real de Running (mismo
// patrón que viewSessionWorkout() en Plan/initPlanEvents.js: navega de
// página y, ya en Running, abre directamente su vista de detalle). Una
// planificada abre el detalle propio de Carreras (RaceDetailView.js),
// como overlay con su propia entrada de historial para que el gesto de
// atrás del móvil la cierre sin salir de la app.
function openRaceEntry(kind, id) {

    if (kind === "completed") {
        navigate(Running);
        openRunningDetail(id);
        return;
    }

    setSelectedPlannedRaceId(id);
    history.pushState(RACE_DETAIL_HISTORY_STATE, "");

    rerender();

}

function closeRaceDetail() {

    if (history.state?.raceDetail) {
        history.back();
        return;
    }

    setSelectedPlannedRaceId(null);
    rerender();

}

// Un mismo botón sirve para la tarjeta de la lista (Próximas/Pasadas) y
// para el propio detalle — si la carrera borrada es la que está abierta
// en el detalle, hay que cerrarlo (ya no queda nada que mostrar), si no,
// basta con volver a pintar la lista sin ella.
function deletePlannedRaceEntry(id) {

    if (!window.confirm("¿Borrar esta carrera planificada? No se puede deshacer.")) return;

    deletePlannedRace(id);

    if (getSelectedPlannedRaceId() === id) {
        closeRaceDetail();
        return;
    }

    rerender();

}

async function shareRace(raceId) {

    const race = getPlannedRaces().find(r => r.id === raceId);
    if (!race) return;

    const shareData = {
        title: race.name || "Carrera",
        text: [race.name, race.location].filter(Boolean).join(" — "),
        url: race.url || undefined
    };

    if (navigator.share) {
        // El usuario puede cerrar la hoja de compartir sin elegir nada —
        // eso rechaza la promesa, no es un error que avisar.
        navigator.share(shareData).catch(() => {});
        return;
    }

    if (race.url && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(race.url).catch(() => {});
    }

}

// Enlace de inscripción de una carrera planificada — se abre en pestaña
// nueva porque es un sitio externo (alcanzatumeta.es u otro organizador),
// no una vista propia de la app.
function openRaceUrl(url) {

    window.open(url, "_blank", "noopener,noreferrer");

}

function openRaceImport() {

    resetRaceImport();
    setRaceImportStep("upload");

    // Sin esto, el gesto de atrás del móvil no tiene una entrada de
    // historial propia que consumir y se sale directo de la app — mismo
    // motivo que openPlanImport() en Plan/initPlanEvents.js.
    history.pushState(RACE_IMPORT_HISTORY_STATE, "");

    rerender();

}

function closeRaceImport() {

    if (history.state?.raceImport) {
        history.back();
        return;
    }

    setRaceImportStep("closed");
    rerender();

}

// Registrados una sola vez a nivel de módulo (no dentro de
// initCarrerasEvents, que se vuelve a llamar en cada render) — mismo
// motivo que el listener equivalente de initPlanEvents.js. Los dos
// overlays (wizard y detalle) son independientes: cada uno solo cierra
// el suyo si estaba abierto.
window.addEventListener("popstate", () => {

    if (getRaceImportStep() !== "closed") {
        setRaceImportStep("closed");
        rerender();
    }

    if (getSelectedPlannedRaceId()) {
        setSelectedPlannedRaceId(null);
        rerender();
    }

});

async function handleRaceFileSelected(file) {

    setRaceImportParseError(null);

    let text;

    try {
        text = await file.text();
    } catch {
        setRaceImportParseError(`No se pudo leer "${file.name}".`);
        rerender();
        return;
    }

    try {

        const plan = importRaces("json", text);

        setParsedRaces(plan);
        setRaceImportStep("review");

    } catch (err) {

        setRaceImportParseError(err.message);

    }

    rerender();

}

function performRaceImport() {

    const plan = getParsedRaces();
    if (!plan) return;

    const missingDate = plan.races.some(r => !r.date);

    if (missingDate) {
        setRaceImportSaveError("Hay carreras sin fecha — rellénala en todas antes de confirmar.");
        rerender();
        return;
    }

    importPlannedRaces(plan.races).then(({ written, batchId }) => {

        setRaceImportSavedCount(written);
        setRaceImportSavedBatchId(batchId);
        setRaceImportSaveError(null);
        setRaceImportStep("success");
        rerender();

    });

}

// Deshace de golpe la importación que se acaba de guardar — mismo patrón
// que undoPlanImport() en Plan/initPlanEvents.js.
function undoRaceImport(batchId) {

    if (!batchId) return;

    if (!window.confirm("¿Deshacer esta importación? Se borrarán todas las carreras que se acaban de guardar. No se puede deshacer.")) return;

    deletePlannedRacesByBatch(batchId);
    closeRaceImport();

}

export function initCarrerasEvents() {

    document.querySelectorAll('[data-action="select-race-tab"]').forEach(button => {

        button.addEventListener("click", () => selectTab(button.dataset.tab));

    });

    document.querySelectorAll('[data-action="select-race-region"]').forEach(button => {

        button.addEventListener("click", () => selectRegion(button.dataset.region));

    });

    document.querySelectorAll('[data-action="select-race-type"]').forEach(button => {

        button.addEventListener("click", () => selectType(button.dataset.type));

    });

    const searchInput = document.querySelector("#carreras-search-input");

    if (searchInput) {

        searchInput.addEventListener("input", () => {
            setSearchQuery(searchInput.value);
            rerender();
        });

    }

    document.querySelectorAll('[data-action="open-race-entry"]').forEach(card => {

        card.addEventListener("click", () => openRaceEntry(card.dataset.kind, card.dataset.id));

    });

    document.querySelectorAll('[data-action="delete-planned-race"]').forEach(button => {

        button.addEventListener("click", (event) => {

            // En la tarjeta de la lista, todo el <article> abre el detalle
            // al tocarlo (ver open-race-entry más abajo) — sin esto, borrar
            // también lo abriría. En el detalle no hace nada (no hay nada
            // por encima escuchando el click), es inofensivo dejarlo igual.
            event.stopPropagation();

            deletePlannedRaceEntry(button.dataset.id);

        });

    });

    document.querySelectorAll('[data-action="close-race-detail"]').forEach(button => {

        button.addEventListener("click", closeRaceDetail);

    });

    document.querySelectorAll('[data-action="share-race-detail"]').forEach(button => {

        button.addEventListener("click", () => shareRace(button.dataset.raceId));

    });

    document.querySelectorAll('[data-action="open-race-url"]').forEach(button => {

        button.addEventListener("click", () => openRaceUrl(button.dataset.url));

    });

    document.querySelectorAll('[data-action="open-race-import"]').forEach(button => {

        button.addEventListener("click", openRaceImport);

    });

    document.querySelectorAll('[data-action="close-race-import"]').forEach(button => {

        button.addEventListener("click", closeRaceImport);

    });

    const fileInput = document.querySelector("#race-import-file-input");

    if (fileInput) {

        fileInput.addEventListener("change", () => {

            const file = fileInput.files?.[0];
            if (!file) return;

            handleRaceFileSelected(file);

        });

    }

    document.querySelectorAll(".race-review-fields [data-race][data-field]").forEach(input => {

        input.addEventListener("change", () => {

            const field = RACE_REVIEW_FIELDS.find(f => f.key === input.dataset.field);
            if (!field) return;

            const raceIndex = Number(input.dataset.race);

            updateImportRaceField(raceIndex, field.key, parseRaceFieldValue(field, input.value));
            rerender();

        });

    });

    document.querySelectorAll('[data-action="confirm-race-import"]').forEach(button => {

        button.addEventListener("click", performRaceImport);

    });

    document.querySelectorAll('[data-action="undo-race-import"]').forEach(button => {

        button.addEventListener("click", () => {
            undoRaceImport(button.dataset.batchId);
        });

    });

}
