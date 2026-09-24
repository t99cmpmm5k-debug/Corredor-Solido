import { navigate, rerender } from "../../core/router.js";
import { exportData, importDataFromFile } from "../../utils/backup.js";
import { setFeedback, loadMyProfile, setMyProfile, isEditOpen, setEditOpen, setEditError, getProfileStep, setProfileStep } from "./profileStore.js";
import { clearToken, getToken } from "../../data/authStore.js";
import { runSync } from "../../data/syncManager.js";
import { actualizarPerfil } from "../../data/authApi.js";
import { Login } from "../Auth/Auth.js";
import { Running } from "../Running/Running.js";
import { openShoes } from "../Running/initRunningEvents.js";

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
        // no hay banner de Ajustes que mostrar ni falta re-renderizar aquí.
        if (status === "unauthorized") return;

        setFeedback(SYNC_STATUS_FEEDBACK[status] || null);
        rerender();

    });

}

// "Editar perfil" (hero) -- alias y localidad SIEMPRE juntos en el mismo
// PATCH (ver actualizarPerfil en authApi.js), aunque solo se haya tocado
// uno de los dos: localidad "" (campo vaciado y guardado) se envía tal
// cual -- el backend la guarda como NULL, no como cadena vacía (ver
// updatePerfil en server/src/routes/auth.js). Alias vacío no llega a
// mandarse -- comprobación local mínima, el resto de validación (longitud
// mín/máx) la hace el servidor y su mensaje real se muestra tal cual.
function handleSaveProfile() {

    const alias = document.querySelector('[data-field="edit-alias"]')?.value.trim() ?? "";
    const localidad = document.querySelector('[data-field="edit-localidad"]')?.value.trim() ?? "";

    if (!alias) {
        setEditError("El alias no puede estar vacío.");
        rerender();
        return;
    }

    setEditError(null);
    rerender();

    actualizarPerfil(getToken(), { aliasPublico: alias, localidad }).then(data => {

        setMyProfile(data);
        setEditOpen(false);
        rerender();

    }).catch(err => {

        setEditError(err.message || "No se pudo guardar el perfil.");
        rerender();

    });

}

const SETTINGS_HISTORY_STATE = { profileSettings: true };

function openProfileSettings() {

    setProfileStep("settings");

    // Sin esto, el gesto de atrás del móvil no tiene una entrada de
    // historial propia que consumir y se sale directo de la app -- mismo
    // patrón que openDetail()/openShoes() en Running/initRunningEvents.js.
    history.pushState(SETTINGS_HISTORY_STATE, "");

    rerender();

}

function closeProfileSettings() {

    if (history.state?.profileSettings) {
        history.back();
        return;
    }

    setProfileStep("idle");
    rerender();

}

// Registrado una sola vez a nivel de módulo (no dentro de
// initProfileEvents, que se vuelve a llamar en cada render) -- mismo
// motivo que el listener equivalente de Running: si no, se acumularía un
// listener de window por cada rerender.
window.addEventListener("popstate", () => {

    if (getProfileStep() === "settings") {
        setProfileStep("idle");
        rerender();
    }

});

export function initProfileEvents() {

    // Solo pide el perfil real la primera vez que de verdad se visita
    // Perfil (esta función corre tras CUALQUIER render de la app, ver
    // core/render.js) -- loadMyProfile() es idempotente (una sola
    // petición real por sesión, mismo criterio que loadHourlyWeather()),
    // así que esto nunca dispara una segunda petición si ya se cargó antes.
    if (document.querySelector(".profile")) {
        loadMyProfile();
    }

    document.querySelector('[data-action="toggle-edit-profile"]')?.addEventListener("click", () => {
        setEditOpen(!isEditOpen());
        rerender();
    });

    // Botón "Editar" de la sección Comunidad -- abre el mismo formulario
    // del hero (nunca lo cierra, a diferencia del toggle de arriba) y baja
    // el scroll hasta él, porque vive lejos de este botón (ver comentario
    // de ProfileCommunitySection en Profile.js).
    document.querySelector('[data-action="edit-profile-from-community"]')?.addEventListener("click", () => {
        setEditOpen(true);
        rerender();
        document.querySelector(".profile-hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.querySelector('[data-action="cancel-edit-profile"]')?.addEventListener("click", () => {
        setEditOpen(false);
        rerender();
    });

    document.querySelector('[data-action="save-edit-profile"]')?.addEventListener("click", handleSaveProfile);

    // Botón propio de Equipamiento (Perfil) -- distinto de
    // "[data-action='open-shoes']" (el de Running) a propósito, ver el
    // comentario junto a RunningShoeMileageSummary() en Running.js.
    document.querySelector('[data-action="profile-open-shoes"]')?.addEventListener("click", () => {
        navigate(Running);
        openShoes();
    });

    document.querySelector('[data-action="open-profile-settings"]')?.addEventListener("click", openProfileSettings);
    document.querySelector('[data-action="close-profile-settings"]')?.addEventListener("click", closeProfileSettings);

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
