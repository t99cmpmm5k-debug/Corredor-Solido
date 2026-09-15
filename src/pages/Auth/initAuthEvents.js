import { navigate, rerender } from "../../core/router.js";
import { Home } from "../Home/Home.js";
import { Login, Registro, RevisaTuEmail, VerificarCuenta, RecuperarPassword, NuevaPassword } from "./Auth.js";
import { login, registro, verificar, reenviarVerificacion, recuperar, restablecer } from "../../data/authApi.js";
import { runSync } from "../../data/syncManager.js";
import { setToken } from "../../data/authStore.js";
import { hydrate } from "../../data/workoutStore.js";
import { hydrate as hydrateGymSessions } from "../../data/gymSessionStore.js";
import { hydrate as hydrateReferenceRoutes } from "../../data/referenceRouteStore.js";
import {
    setAuthFeedback, isAuthSubmitting, setAuthSubmitting,
    getPendingVerificationEmail, setPendingVerificationEmail,
    setAuthLoadingText
} from "./authUiStore.js";

// Se lee del DOM en el momento del submit, no se guarda en ningún store en
// cada tecla -- un input controlado por rerender() en "input" cierra el
// teclado en iOS a cada pulsación (mismo bug ya resuelto en Perfil/Gym,
// aquí ni siquiera se llega a introducir).
function readCredentials() {

    const email = document.querySelector("#auth-email-input")?.value.trim() ?? "";
    const password = document.querySelector("#auth-password-input")?.value ?? "";

    return { email, password };

}

function handleLoginOrRegistroSubmit(mode) {

    const { email, password } = readCredentials();

    if (!email || !password) {

        setAuthFeedback({ type: "error", text: "Rellena email y contraseña." });
        rerender();
        return;

    }

    setAuthFeedback(null);
    setAuthSubmitting(true);
    rerender();

    const request = mode === "login" ? login(email, password) : registro(email, password);

    request
        .then(data => {

            setAuthSubmitting(false);

            if (mode === "registro") {

                // Registro ya no da acceso inmediato -- verificación de
                // email obligatoria (confirmado con el usuario). El JWT
                // llega recién al verificar, ver initVerifyAccount() más
                // abajo.
                setPendingVerificationEmail(email);
                setAuthFeedback(null);
                navigate(RevisaTuEmail);
                return;

            }

            setToken(data.token);
            setAuthFeedback(null);
            navigate(Home);

            // Un login a mitad de sesión (sin recargar la app) no pasa por
            // initContinuousSync() -- ese solo arranca una vez en el boot
            // (ver main.js). Sin este runSync() explícito, nada bajaría lo
            // que ya hubiera en el servidor de otro dispositivo hasta el
            // próximo primer plano o el botón manual. runSync() ya hace
            // push-antes-de-pull (ver syncManager.js), así que esto también
            // fusiona con seguridad histórico local propio del dispositivo.
            runSync("post-login");

        })
        .catch(err => {

            setAuthSubmitting(false);

            if (err.code === "EMAIL_NOT_VERIFIED") {

                setPendingVerificationEmail(email);
                setAuthFeedback({
                    type: "error",
                    text: err.message,
                    action: { label: "Reenviar email", dataAction: "resend-verification" }
                });

            } else {

                setAuthFeedback({ type: "error", text: err.message || "No se pudo completar la operación." });

            }

            rerender();

        });

}

function handleRecuperarSubmit() {

    const email = document.querySelector("#auth-email-input")?.value.trim() ?? "";

    if (!email) {
        setAuthFeedback({ type: "error", text: "Introduce tu email." });
        rerender();
        return;
    }

    setAuthFeedback(null);
    setAuthSubmitting(true);
    rerender();

    recuperar(email)
        .then(() => {

            setAuthSubmitting(false);
            setAuthFeedback({ type: "info", text: "Si ese email existe, te hemos enviado un enlace para restablecer tu contraseña." });
            rerender();

        })
        .catch(err => {

            setAuthSubmitting(false);
            setAuthFeedback({ type: "error", text: err.message || "No se pudo enviar el enlace." });
            rerender();

        });

}

function handleNuevaPasswordSubmit() {

    const newPassword = document.querySelector("#auth-new-password-input")?.value ?? "";
    const confirmPassword = document.querySelector("#auth-new-password-confirm-input")?.value ?? "";
    const token = new URLSearchParams(location.search).get("reset_token");

    // Fuera de la URL en cuanto se intenta usar -- mismo motivo que
    // initVerifyAccount() (no dejar un token sensible visible en la barra
    // de direcciones/historial más tiempo del necesario).
    if (token) history.replaceState(null, "", location.pathname);

    if (!newPassword || newPassword !== confirmPassword) {
        setAuthFeedback({ type: "error", text: "Las contraseñas no coinciden." });
        rerender();
        return;
    }

    if (!token) {
        setAuthFeedback({ type: "error", text: "Enlace inválido." });
        rerender();
        return;
    }

    setAuthFeedback(null);
    setAuthSubmitting(true);
    rerender();

    restablecer(token, newPassword)
        .then(() => {

            setAuthSubmitting(false);
            // Se deja el aviso puesto (no se limpia) a propósito -- Login
            // lo va a pintar justo después de navigate(), confirmando que
            // el cambio se guardó.
            setAuthFeedback({ type: "info", text: "Contraseña actualizada. Inicia sesión con tu nueva contraseña." });
            navigate(Login);

        })
        .catch(err => {

            setAuthSubmitting(false);
            setAuthFeedback({ type: "error", text: err.message || "No se pudo restablecer la contraseña." });
            rerender();

        });

}

function handleSubmit(mode) {

    if (isAuthSubmitting()) return;

    if (mode === "login" || mode === "registro") return handleLoginOrRegistroSubmit(mode);
    if (mode === "recuperar") return handleRecuperarSubmit();
    if (mode === "nueva-password") return handleNuevaPasswordSubmit();

}

// Botón "Reenviar email" -- mismo endpoint y mismo email guardado
// (pendingVerificationEmail) tanto si se llega desde "Revisa tu email"
// como desde el aviso de login sin verificar, así que un único handler
// sirve para los dos sitios.
function handleResendVerification() {

    const email = getPendingVerificationEmail();

    if (!email || isAuthSubmitting()) return;

    setAuthFeedback(null);
    setAuthSubmitting(true);
    rerender();

    reenviarVerificacion(email)
        .then(() => {

            setAuthSubmitting(false);
            setAuthFeedback({ type: "info", text: "Te hemos enviado un nuevo email de verificación." });
            rerender();

        })
        .catch(err => {

            setAuthSubmitting(false);
            setAuthFeedback({ type: "error", text: err.message || "No se pudo reenviar el email." });
            rerender();

        });

}

// Guarda entre renders (no se resetea en cada rerender de la propia
// pantalla) -- sin esto, cada rerender que dispara el propio flujo
// (submitting -> resultado) volvería a llamar a initVerifyAccount() y
// mandaría el token una segunda vez. Una carga de página real (clic en el
// enlace del email) siempre arranca este módulo desde cero, así que el
// guard vuelve a "false" exactamente cuando debe.
let verificationRequested = false;

function initVerifyAccount() {

    const container = document.querySelector("[data-verify-account]");
    if (!container || verificationRequested) return;

    verificationRequested = true;

    const params = new URLSearchParams(location.search);
    const token = params.get("verify_token");

    // El token ya no hace falta en la URL una vez leído -- fuera del
    // historial/barra de direcciones en cuanto se usa.
    history.replaceState(null, "", location.pathname);

    if (!token) {

        setAuthSubmitting(false);
        setAuthFeedback({ type: "error", text: "Enlace de verificación inválido." });
        rerender();
        return;

    }

    setAuthSubmitting(true);
    setAuthFeedback(null);
    setAuthLoadingText("Verificando tu cuenta...");
    rerender();

    verificar(token)
        .then(data => {

            setToken(data.token);
            setAuthLoadingText("Subiendo tu historial...");
            rerender();

            // getSyncableData() (dentro de runSync(), ver syncManager.js)
            // lee cachés en memoria que solo están pobladas cuando su
            // hydrate() ha terminado. main.js arranca la hidratación en
            // paralelo al resto del boot con un timeout de 1.5s para no
            // bloquear el primer render (ver HYDRATE_TIMEOUT_MS) -- con un
            // histórico real grande, es perfectamente posible llegar aquí
            // (desde un enlace de email, arranque en frío) ANTES de que
            // termine de verdad. hydrate() está memoizada (ver
            // workoutStore.js/gymSessionStore.js/referenceRouteStore.js),
            // así que esperarla aquí de nuevo es gratis si ya terminó, y
            // espera de verdad si no.
            return Promise.all([hydrate(), hydrateGymSessions(), hydrateReferenceRoutes()])
                .then(() => runSync("post-verify"));

        })
        .then(() => {

            // La cuenta YA está verificada y con token válido en este punto
            // -- un fallo al sincronizar (red, servidor caído...) no debe
            // dejar a alguien fuera de su propia app. runSync() ya se traga
            // sus propios errores (offline/401/otros, ver syncManager.js) y
            // no los relanza, así que llegar aquí siempre significa
            // "verificación completada", sincronizada o no.
            setAuthSubmitting(false);
            navigate(Home);

        })
        .catch(err => {

            setAuthSubmitting(false);
            setAuthFeedback({ type: "error", text: err.message || "No se pudo verificar la cuenta." });
            rerender();

        });

}

export function initAuthEvents() {

    const form = document.querySelector("[data-auth-form]");

    if (form) {

        form.addEventListener("submit", event => {

            event.preventDefault();
            handleSubmit(form.dataset.authForm);

        });

    }

    const switchToRegistro = document.querySelector('[data-action="switch-to-registro"]');

    if (switchToRegistro) {

        switchToRegistro.addEventListener("click", () => {

            setAuthFeedback(null);
            navigate(Registro);

        });

    }

    const switchToLogin = document.querySelector('[data-action="switch-to-login"]');

    if (switchToLogin) {

        switchToLogin.addEventListener("click", () => {

            setAuthFeedback(null);
            navigate(Login);

        });

    }

    const forgotPassword = document.querySelector('[data-action="open-forgot-password"]');

    if (forgotPassword) {

        forgotPassword.addEventListener("click", () => {

            setAuthFeedback(null);
            navigate(RecuperarPassword);

        });

    }

    document.querySelectorAll('[data-action="resend-verification"]').forEach(button => {

        button.addEventListener("click", handleResendVerification);

    });

    initVerifyAccount();

}
