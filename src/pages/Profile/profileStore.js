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

// Alias público (Comunidad) -- { status: "idle"|"loading"|"ready"|"unavailable", value }.
// Igual que homeWeatherStore.js: una sola petición real por sesión
// (idempotente), nunca deja "loading" colgado para siempre. "unavailable"
// (sin sesión, sin red, o error del servidor) no es un error visible --
// el formulario de Perfil simplemente se muestra sin alias actual
// precargado, se puede escribir uno nuevo igual.
let myAlias = { status: "idle", value: null };

export function getMyAlias() {

    return myAlias;

}

// Se llama tras guardar un alias nuevo (ver initProfileEvents.js) para que
// la propia pantalla refleje el valor recién guardado sin esperar a una
// nueva petición GET -- el servidor ya lo confirmó en la respuesta del
// PATCH, no hace falta volver a pedirlo.
export function setMyAlias(value) {

    myAlias = { status: "ready", value };

}

export function loadMyAlias() {

    if (myAlias.status !== "idle") return;
    if (!isLoggedIn()) return;

    myAlias = { status: "loading", value: null };

    getPerfil(getToken()).then(data => {

        myAlias = { status: "ready", value: data.aliasPublico ?? null };
        rerender();

    }).catch(err => {

        console.warn("No se pudo cargar el alias público.", err);
        myAlias = { status: "unavailable", value: null };
        rerender();

    });

}
