// Estado de UI de Login/Registro -- separado de authStore.js (que es la
// sesión de verdad) porque esto es solo "qué mensaje/estado de carga se ve
// ahora mismo", se pierde sin problema en cada rerender. Mismo patrón que
// profileStore.js (getFeedback/setFeedback).
let feedback = null; // { type: "error" | "info", text: string, action?: { label, dataAction } } | null
let submitting = false;

// Email al que se le acaba de mandar (o intentar mandar) un email de
// verificación -- lo necesita tanto "Revisa tu email" como el botón
// "Reenviar" que aparece en el aviso de login sin verificar, para no tener
// que volver a pedírselo al usuario.
let pendingVerificationEmail = null;

export function getAuthFeedback() {

    return feedback;

}

export function setAuthFeedback(value) {

    feedback = value;

}

export function isAuthSubmitting() {

    return submitting;

}

export function setAuthSubmitting(value) {

    submitting = value;

}

export function getPendingVerificationEmail() {

    return pendingVerificationEmail;

}

export function setPendingVerificationEmail(email) {

    pendingVerificationEmail = email;

}
