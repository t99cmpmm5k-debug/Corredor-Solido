import "./Auth.css";

import { getAuthFeedback, isAuthSubmitting, getPendingVerificationEmail, getAuthLoadingText } from "./authUiStore.js";

function AuthBanner(feedback) {

    if (!feedback) return "";

    const icon = feedback.type === "error"
        ? "solar:danger-triangle-bold-duotone"
        : "solar:info-circle-bold-duotone";

    return `

        <div class="auth-banner auth-banner-${feedback.type}">

            <iconify-icon icon="${icon}"></iconify-icon>

            <div class="auth-banner-content">

                <span>${feedback.text}</span>

                ${feedback.action ? `

                    <button type="button" class="auth-banner-action" data-action="${feedback.action.dataAction}">

                        ${feedback.action.label}

                    </button>

                ` : ""}

            </div>

        </div>

    `;

}

// Cascarón compartido por las 6 pantallas de Auth -- misma marca arriba,
// mismo ancho de tarjeta centrada, para no repetirlo seis veces.
function AuthShell(innerHtml) {

    return `

        <div class="auth-page" data-auth-page>

            <div class="auth-content">

                <div class="auth-brand">

                    <iconify-icon icon="solar:mountains-bold-duotone"></iconify-icon>

                    <span>Corredor Sólido</span>

                </div>

                ${innerHtml}

            </div>

        </div>

    `;

}

// Login y Registro comparten la misma tarjeta (mismos dos campos, mismo
// flujo) -- solo cambian título/texto del botón/enlace de abajo, por eso
// una única plantilla en vez de duplicar el marcado dos veces.
function AuthCard({ mode, title, submitLabel, switchHint, switchLinkLabel, switchAction }) {

    const feedback = getAuthFeedback();
    const submitting = isAuthSubmitting();

    return AuthShell(`

        <form class="auth-card" data-auth-form="${mode}" novalidate>

            <h1>${title}</h1>

            ${AuthBanner(feedback)}

            <label class="auth-field">

                <span>Email</span>

                <input type="email" id="auth-email-input" autocomplete="email" placeholder="tu@email.com">

            </label>

            <label class="auth-field">

                <span>Contraseña</span>

                <input type="password" id="auth-password-input" autocomplete="${mode === "login" ? "current-password" : "new-password"}" placeholder="••••••••">

            </label>

            ${mode === "login" ? `

                <button type="button" class="auth-forgot-link" data-action="open-forgot-password">

                    ¿Olvidaste tu contraseña?

                </button>

            ` : ""}

            <button type="submit" class="auth-submit-button" ${submitting ? "disabled" : ""}>

                ${submitting ? "Un momento..." : submitLabel}

            </button>

            <p class="auth-switch">

                ${switchHint} <button type="button" class="auth-switch-link" data-action="${switchAction}">${switchLinkLabel}</button>

            </p>

        </form>

    `);

}

export function Login() {

    return AuthCard({
        mode: "login",
        title: "Inicia sesión",
        submitLabel: "Entrar",
        switchHint: "¿No tienes cuenta?",
        switchLinkLabel: "Regístrate",
        switchAction: "switch-to-registro"
    });

}

export function Registro() {

    return AuthCard({
        mode: "registro",
        title: "Crea tu cuenta",
        submitLabel: "Crear cuenta",
        switchHint: "¿Ya tienes cuenta?",
        switchLinkLabel: "Inicia sesión",
        switchAction: "switch-to-login"
    });

}

// Pantalla de espera tras un registro con éxito -- ya no hay acceso
// inmediato (verificación obligatoria), así que esto sustituye a "entra
// directo a Home" como siguiente paso.
export function RevisaTuEmail() {

    const feedback = getAuthFeedback();
    const submitting = isAuthSubmitting();
    const email = getPendingVerificationEmail();

    return AuthShell(`

        <div class="auth-card auth-card-centered">

            <iconify-icon icon="solar:letter-bold-duotone" class="auth-big-icon"></iconify-icon>

            <h1>Revisa tu email</h1>

            <p class="auth-hint">

                Te hemos enviado un enlace de verificación a <strong>${email || "tu email"}</strong>. Ábrelo para activar tu cuenta.

            </p>

            ${AuthBanner(feedback)}

            <button type="button" class="auth-submit-button" data-action="resend-verification" ${submitting ? "disabled" : ""}>

                ${submitting ? "Enviando..." : "Reenviar email"}

            </button>

            <p class="auth-switch">

                <button type="button" class="auth-switch-link" data-action="switch-to-login">Volver a inicio de sesión</button>

            </p>

        </div>

    `);

}

// Se alcanza desde el enlace del email (?verify_token=...) -- se
// auto-envía sola al cargar (ver initVerifyAccount() en
// initAuthEvents.js), el usuario no rellena nada aquí.
export function VerificarCuenta() {

    const feedback = getAuthFeedback();
    const submitting = isAuthSubmitting();

    return AuthShell(`

        <div class="auth-card auth-card-centered" data-verify-account>

            ${submitting ? `

                <p class="auth-hint">${getAuthLoadingText() || "Verificando tu cuenta..."}</p>

            ` : `

                ${AuthBanner(feedback || { type: "error", text: "No se pudo verificar la cuenta." })}

                <p class="auth-switch">

                    <button type="button" class="auth-switch-link" data-action="switch-to-login">Volver a inicio de sesión</button>

                </p>

            `}

        </div>

    `);

}

export function RecuperarPassword() {

    const feedback = getAuthFeedback();
    const submitting = isAuthSubmitting();

    return AuthShell(`

        <form class="auth-card" data-auth-form="recuperar" novalidate>

            <h1>Recupera tu contraseña</h1>

            <p class="auth-hint">Te enviaremos un enlace para restablecerla.</p>

            ${AuthBanner(feedback)}

            <label class="auth-field">

                <span>Email</span>

                <input type="email" id="auth-email-input" autocomplete="email" placeholder="tu@email.com">

            </label>

            <button type="submit" class="auth-submit-button" ${submitting ? "disabled" : ""}>

                ${submitting ? "Enviando..." : "Enviar enlace"}

            </button>

            <p class="auth-switch">

                <button type="button" class="auth-switch-link" data-action="switch-to-login">Volver a inicio de sesión</button>

            </p>

        </form>

    `);

}

// Se alcanza desde el enlace del email (?reset_token=...) -- a diferencia
// de VerificarCuenta, aquí sí hace falta que el usuario escriba algo.
export function NuevaPassword() {

    const feedback = getAuthFeedback();
    const submitting = isAuthSubmitting();

    return AuthShell(`

        <form class="auth-card" data-auth-form="nueva-password" novalidate>

            <h1>Nueva contraseña</h1>

            ${AuthBanner(feedback)}

            <label class="auth-field">

                <span>Nueva contraseña</span>

                <input type="password" id="auth-new-password-input" autocomplete="new-password" placeholder="••••••••">

            </label>

            <label class="auth-field">

                <span>Repite la contraseña</span>

                <input type="password" id="auth-new-password-confirm-input" autocomplete="new-password" placeholder="••••••••">

            </label>

            <button type="submit" class="auth-submit-button" ${submitting ? "disabled" : ""}>

                ${submitting ? "Guardando..." : "Guardar contraseña"}

            </button>

        </form>

    `);

}
