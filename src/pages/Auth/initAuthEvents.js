import { navigate, rerender } from "../../core/router.js";
import { Home } from "../Home/Home.js";
import { Login, Registro, RevisaTuEmail, VerificarCuenta, RecuperarPassword, NuevaPassword } from "./Auth.js";
import { login, registro, verificar, reenviarVerificacion, recuperar, restablecer } from "../../data/authApi.js";
import { pushSync } from "../../data/syncApi.js";
import { setToken } from "../../data/authStore.js";
import { getSyncableData } from "../../utils/backup.js";
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

            // Un login normal (cuenta ya verificada antes) NO dispara la
            // subida inicial -- esa es cosa de justo-tras-verificar (ver
            // initVerifyAccount() más abajo), un momento único que solo
            // pasa una vez por cuenta. Si este login es en un dispositivo
            // con histórico local propio Y la cuenta ya tiene datos en el
            // servidor, hace falta FUSIONAR en las dos direcciones, no
            // subir sin más -- eso es Fase 6 (pendiente), no esto.
            navigate(Home);

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

            // Bug real encontrado en pruebas: getSyncableData() lee cachés
            // en memoria que solo están pobladas cuando su hydrate() ha
            // terminado. main.js arranca la hidratación en paralelo al
            // resto del boot con un timeout de 1.5s para no bloquear el
            // primer render (ver HYDRATE_TIMEOUT_MS) -- con un histórico
            // real grande, es perfectamente posible llegar aquí (desde un
            // enlace de email, arranque en frío) ANTES de que termine de
            // verdad, y entonces getSyncableData() ve los 5 stores vacíos
            // aunque sí haya datos. hydrate() está memoizada (ver
            // workoutStore.js/gymSessionStore.js/referenceRouteStore.js),
            // así que esperarla aquí de nuevo es gratis si ya terminó, y
            // espera de verdad si no -- a diferencia de main.js, aquí SÍ
            // interesa esperar de verdad: el único propósito de este paso
            // es leer esos datos.
            return Promise.all([hydrate(), hydrateGymSessions(), hydrateReferenceRoutes()])
                .then(() => {

                    // Único momento en que tiene sentido una subida "de
                    // golpe": la cuenta acaba de existir de verdad (JWT
                    // recién emitido), así que el servidor está vacío para
                    // ella -- ningún dato que fusionar, solo subir lo que ya
                    // había en local antes de tener cuenta (confirmado con
                    // el usuario, ver plan acordado).
                    const payload = getSyncableData();
                    const hasLocalData = Object.values(payload).some(records => records.length > 0);

                    console.info(
                        "[Fase 3] Historial local tras hidratar:",
                        Object.fromEntries(Object.entries(payload).map(([key, records]) => [key, records.length]))
                    );

                    if (!hasLocalData) {
                        setAuthSubmitting(false);
                        navigate(Home);
                        return;
                    }

                    setAuthLoadingText("Subiendo tu historial...");
                    rerender();

                    // Mismo nivel "info" que el log de arriba (no "log" ni
                    // "debug") a propósito -- si éste tampoco apareciera en
                    // consola, descarta de raíz que sea el filtro de nivel
                    // de DevTools y confirma que el problema es anterior a
                    // esta línea, no en pushSync() en sí.
                    console.info("[Fase 3] Llamando a POST /api/sync con", Object.fromEntries(Object.entries(payload).map(([key, records]) => [key, records.length])));

                    return pushSync(payload, data.token)
                        .then(() => {

                            console.info("[Fase 3] POST /api/sync respondió con éxito.");
                            setAuthSubmitting(false);
                            navigate(Home);

                        })
                        .catch(err => {

                            // La cuenta YA está verificada y con token
                            // válido -- un fallo al subir el histórico (red,
                            // servidor caído...) no debe dejar a alguien
                            // fuera de su propia app. Los datos siguen
                            // intactos en IndexedDB; el reintento real queda
                            // para la Fase 4 (sincronización continua: sync
                            // al arrancar si hay conexión), no aquí.
                            console.warn("No se pudo subir el histórico inicial -- se reintentará más adelante.", err);
                            setAuthSubmitting(false);
                            navigate(Home);

                        });

                });

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
