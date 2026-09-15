// Envío de emails transaccionales vía Resend -- ver evaluación con el
// usuario (exim4 del VPS descartado por riesgo de entregabilidad: sin
// SPF/DKIM/reputación de IP garantizados, y puerto 25 saliente sin
// confirmar abierto). API REST directa por fetch, sin SDK: dos llamadas,
// no justifica una dependencia nueva.
const RESEND_API_URL = "https://api.resend.com/emails";

async function sendEmail({ to, subject, html }) {

    const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html
        })
    });

    if (!res.ok) {

        const body = await res.text().catch(() => "");
        throw new Error(`Resend respondió ${res.status} al enviar a ${to}: ${body}`);

    }

}

export function sendVerificationEmail(to, token) {

    const link = `${process.env.FRONTEND_URL}?verify_token=${token}`;

    return sendEmail({
        to,
        subject: "Verifica tu cuenta de Corredor Sólido",
        html: `
            <p>Falta un paso para activar tu cuenta de Corredor Sólido.</p>
            <p><a href="${link}">Verificar mi cuenta</a></p>
            <p>El enlace caduca en 24 horas. Si no has sido tú, ignora este email.</p>
        `
    });

}

export function sendPasswordResetEmail(to, token) {

    const link = `${process.env.FRONTEND_URL}?reset_token=${token}`;

    return sendEmail({
        to,
        subject: "Recupera tu contraseña de Corredor Sólido",
        html: `
            <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
            <p><a href="${link}">Elegir nueva contraseña</a></p>
            <p>El enlace caduca en 1 hora. Si no has sido tú, ignora este email -- tu contraseña actual sigue funcionando.</p>
        `
    });

}
