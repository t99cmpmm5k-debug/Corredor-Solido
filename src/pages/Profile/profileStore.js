import { getPerfil } from "../../data/authApi.js";
import { getToken, isLoggedIn } from "../../data/authStore.js";
import { rerender } from "../../core/router.js";

// feedback: { type: "success" | "error", text } | null — resultado de la
// última exportación/importación, se limpia al iniciar una acción nueva.
let feedback = null;

export function getFeedback() {

    return feedback;

}

export function setFeedback(next) {

    feedback = next;

}

// Perfil real (alias público + localidad + fecha de creación de la
// cuenta, rediseño 2026-09-25 -- antes solo el alias, ver
// project_profile_redesign) -- { status: "idle"|"loading"|"ready"|"unavailable",
// aliasPublico, localidad, createdAt }. Una sola petición real por sesión
// (idempotente, mismo patrón que homeWeatherStore.js), nunca deja
// "loading" colgado. "unavailable" (sin sesión, sin red, o error del
// servidor) no es un error visible -- el hero simplemente no muestra la
// identidad hasta que haya datos reales, nunca un valor inventado.
let myProfile = { status: "idle", aliasPublico: null, localidad: null, createdAt: null };

export function getMyProfile() {

    return myProfile;

}

// Refleja de inmediato lo que el servidor acaba de confirmar en un PATCH
// (ver handleSaveProfile en initProfileEvents.js) sin esperar a una nueva
// petición GET -- merge, no reemplazo entero: un PATCH solo de localidad
// no debe borrar el aliasPublico ya cargado (y viceversa), porque la
// respuesta de ESE PATCH concreto no trae el otro campo.
export function setMyProfile(partial) {

    myProfile = { ...myProfile, ...partial, status: "ready" };

}

export function loadMyProfile() {

    if (myProfile.status !== "idle") return;
    if (!isLoggedIn()) return;

    myProfile = { ...myProfile, status: "loading" };

    getPerfil(getToken()).then(data => {

        myProfile = {
            status: "ready",
            aliasPublico: data.aliasPublico ?? null,
            localidad: data.localidad ?? null,
            createdAt: data.createdAt ?? null
        };
        rerender();

    }).catch(err => {

        console.warn("No se pudo cargar el perfil.", err);
        myProfile = { ...myProfile, status: "unavailable" };
        rerender();

    });

}

// Formulario "Editar perfil" del hero (Perfil, rediseño 2026-09-25) --
// abierto/cerrado, con su propio feedback de error (para no confundirlo
// con `feedback` de arriba, que es de exportar/importar/sincronizar).
let editOpen = false;
let editError = null;

export function isEditOpen() {

    return editOpen;

}

export function setEditOpen(open) {

    editOpen = open;
    if (open) editError = null;

}

export function getEditError() {

    return editError;

}

export function setEditError(message) {

    editError = message;

}

// Pantalla secundaria "Ajustes" (Perfil, rediseño 2026-09-25) -- mismo
// patrón de "step" que RunningDetailView/ReferenceRoutesListView
// (runningStore.js: getWizardStep/setWizardStep), aquí solo con dos
// valores posibles.
let step = "idle";

export function getProfileStep() {

    return step;

}

export function setProfileStep(next) {

    step = next;

}
