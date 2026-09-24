import { Router } from "express";
import { pool } from "../db.js";
import { hashPassword, verifyPassword, signToken } from "../authUtils.js";
import { generateAuthToken, hashAuthToken } from "../tokenUtils.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../email.js";
import { emailRateLimit } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

const MIN_PASSWORD_LENGTH = 8;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// Alias público (Comunidad) -- longitud razonable, sin más validación de
// formato (pedido explícito de esta fase).
const ALIAS_MIN_LENGTH = 2;
const ALIAS_MAX_LENGTH = 50;

// Localidad (Perfil, rediseño 2026-09-25) -- texto libre y opcional
// (puede vaciarse: "" borra la que hubiera), solo un tope de longitud
// razonable, sin mínimo (a diferencia del alias, aquí no hay nada que
// "demasiado corto" deba rechazar).
const LOCALIDAD_MAX_LENGTH = 100;

function isValidEmail(email) {
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Emitir invalida cualquier token anterior del mismo (usuario, propósito)
// -- como mucho un enlace válido a la vez, así "reenviar" apaga el
// anterior en vez de dejar varios enlaces vivos a la vez.
async function issueToken(userId, purpose, ttlMs) {

    await pool.execute(
        "DELETE FROM auth_tokens WHERE user_id = ? AND purpose = ?",
        [userId, purpose]
    );

    const token = generateAuthToken();
    const expiresAt = new Date(Date.now() + ttlMs);

    await pool.execute(
        "INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at) VALUES (?, ?, ?, ?)",
        [userId, purpose, hashAuthToken(token), expiresAt]
    );

    return token;

}

// Un solo uso de verdad: la fila se borra en cuanto se consume, válido o
// no vuelve a servir una segunda vez con el mismo token.
async function consumeToken(rawToken, purpose) {

    if (typeof rawToken !== "string" || !rawToken) return null;

    const tokenHash = hashAuthToken(rawToken);

    const [rows] = await pool.execute(
        "SELECT user_id FROM auth_tokens WHERE token_hash = ? AND purpose = ? AND expires_at > NOW()",
        [tokenHash, purpose]
    );

    const row = rows[0];
    if (!row) return null;

    await pool.execute("DELETE FROM auth_tokens WHERE token_hash = ?", [tokenHash]);

    return row.user_id;

}

authRouter.post("/registro", emailRateLimit, async (req, res) => {

    const { email, password } = req.body ?? {};

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Email no válido." });
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existingRows] = await pool.execute(
        "SELECT id, email_verified_at FROM users WHERE email = ?",
        [normalizedEmail]
    );

    const existing = existingRows[0];

    if (existing) {

        if (existing.email_verified_at) {
            return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
        }

        // Cuenta creada pero nunca verificada -- mejor reenviar un enlace
        // nuevo que devolver un error seco (confirmado con el usuario, ver
        // plan de conexión al backend).
        const token = await issueToken(existing.id, "email_verification", VERIFICATION_TOKEN_TTL_MS);
        await sendVerificationEmail(normalizedEmail, token);

        return res.status(200).json({ pendingVerification: true });

    }

    const passwordHash = await hashPassword(password);

    let userId;

    try {

        const [result] = await pool.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            [normalizedEmail, passwordHash]
        );

        userId = result.insertId;

    } catch (err) {

        // ER_DUP_ENTRY -- alguien ganó la carrera entre el SELECT de arriba
        // y este INSERT (dos registros concurrentes con el mismo email
        // nuevo). Mismo mensaje genérico de siempre.
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
        }

        throw err;

    }

    const token = await issueToken(userId, "email_verification", VERIFICATION_TOKEN_TTL_MS);
    await sendVerificationEmail(normalizedEmail, token);

    // Sin token de sesión -- la cuenta existe pero no da acceso hasta
    // verificar el email (confirmado con el usuario).
    res.status(201).json({ pendingVerification: true });

});

authRouter.post("/login", async (req, res) => {

    const { email, password } = req.body ?? {};

    if (!isValidEmail(email) || typeof password !== "string") {
        return res.status(400).json({ error: "Email o contraseña no válidos." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [rows] = await pool.execute(
        "SELECT id, password_hash, email_verified_at FROM users WHERE email = ?",
        [normalizedEmail]
    );

    const user = rows[0];

    // Mismo mensaje genérico tanto si el email no existe como si la
    // contraseña es incorrecta -- nunca revelar cuál de las dos falló (un
    // mensaje distinto permitiría a alguien "adivinar" qué emails están
    // registrados probando uno a uno).
    const invalidCredentialsResponse = () => res.status(401).json({ error: "Email o contraseña incorrectos." });

    if (!user) return invalidCredentialsResponse();

    const passwordMatches = await verifyPassword(password, user.password_hash);
    if (!passwordMatches) return invalidCredentialsResponse();

    // Este mensaje SÍ es específico, a diferencia del de arriba -- pero
    // solo se llega aquí con la contraseña ya validada, así que no revela
    // nada a quien no la conozca ya (no rompe el criterio anti-enumeración
    // de arriba, confirmado con el usuario).
    if (!user.email_verified_at) {
        return res.status(403).json({
            error: "Verifica tu email antes de iniciar sesión. Revisa tu bandeja de entrada.",
            code: "EMAIL_NOT_VERIFIED"
        });
    }

    res.json({ token: signToken(user.id) });

});

authRouter.post("/verificar", async (req, res) => {

    const { token } = req.body ?? {};

    const userId = await consumeToken(token, "email_verification");

    if (!userId) {
        return res.status(400).json({ error: "Enlace de verificación inválido o caducado." });
    }

    await pool.execute("UPDATE users SET email_verified_at = NOW() WHERE id = ?", [userId]);

    res.json({ token: signToken(userId) });

});

authRouter.post("/reenviar-verificacion", emailRateLimit, async (req, res) => {

    const { email } = req.body ?? {};

    if (isValidEmail(email)) {

        const normalizedEmail = email.trim().toLowerCase();

        const [rows] = await pool.execute(
            "SELECT id, email_verified_at FROM users WHERE email = ?",
            [normalizedEmail]
        );

        const user = rows[0];

        // Solo se manda de verdad si existe y sigue sin verificar -- pero
        // la respuesta es SIEMPRE la misma pase lo que pase, para no
        // revelar nada (mismo criterio que /login).
        if (user && !user.email_verified_at) {

            const token = await issueToken(user.id, "email_verification", VERIFICATION_TOKEN_TTL_MS);
            await sendVerificationEmail(normalizedEmail, token);

        }

    }

    res.json({ ok: true });

});

authRouter.post("/recuperar", emailRateLimit, async (req, res) => {

    const { email } = req.body ?? {};

    if (isValidEmail(email)) {

        const normalizedEmail = email.trim().toLowerCase();

        const [rows] = await pool.execute("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
        const user = rows[0];

        // Misma respuesta exista o no la cuenta -- no revelar qué emails
        // están registrados.
        if (user) {

            const token = await issueToken(user.id, "password_reset", RESET_TOKEN_TTL_MS);
            await sendPasswordResetEmail(normalizedEmail, token);

        }

    }

    res.json({ ok: true });

});

authRouter.post("/restablecer", async (req, res) => {

    const { token, nuevaPassword } = req.body ?? {};

    if (typeof nuevaPassword !== "string" || nuevaPassword.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` });
    }

    const userId = await consumeToken(token, "password_reset");

    if (!userId) {
        return res.status(400).json({ error: "Enlace inválido o caducado." });
    }

    const passwordHash = await hashPassword(nuevaPassword);

    await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);

    res.json({ ok: true });

});

// Perfil propio -- primeras dos rutas protegidas por requireAuth de todo
// este router (las de arriba son todas pre-login, deliberadamente
// públicas). req.userId sale del JWT ya verificado, nunca del cuerpo de
// la petición -- por diseño, con esto es IMPOSIBLE leer o modificar el
// perfil de otro usuario, no hace falta ninguna comprobación aparte de
// "¿es el mismo id?" en el propio WHERE.
//
// Handlers exportados aparte del wiring de la ruta para poder testearlos
// con un pool mockeado y un req/res simulados, sin montar un servidor
// Express de verdad -- mismo patrón que routes/tiles.js y routes/community.js.
// createdAt siempre como ISO string -- mysql2 puede devolver el TIMESTAMP
// como Date o como string según la conexión/driver; normalizarlo aquí
// evita que Perfil (frontend) tenga que saber cuál de las dos formas le
// llegó para sacar el año de "Corredor sólido desde AAAA".
export async function getPerfil(req, res) {

    const [rows] = await pool.execute("SELECT alias_publico, localidad, created_at FROM users WHERE id = ?", [req.userId]);
    const row = rows[0];

    res.json({
        aliasPublico: row?.alias_publico ?? null,
        localidad: row?.localidad ?? null,
        createdAt: row?.created_at ? new Date(row.created_at).toISOString() : null
    });

}

// Alias y localidad se actualizan independientemente (Perfil, rediseño
// 2026-09-25: el hero edita los dos a la vez, pero un PATCH solo con uno
// de los dos -- p. ej. borrar la localidad sin tocar el alias -- también
// tiene que funcionar) -- ambos son opcionales en el body, pero al menos
// uno tiene que venir, si no no hay nada que actualizar. Cada campo
// presente se valida y se guarda por separado; ninguno de los dos se toca
// si el otro falla su propia validación (falla entero antes de tocar la
// base de datos, mismo criterio de "todo o nada" que ya tenía esta ruta).
export async function updatePerfil(req, res) {

    const { aliasPublico, localidad } = req.body ?? {};
    const hasAlias = aliasPublico !== undefined;
    const hasLocalidad = localidad !== undefined;

    if (!hasAlias && !hasLocalidad) {
        return res.status(400).json({ error: "Nada que actualizar." });
    }

    let trimmedAlias, trimmedLocalidad;

    if (hasAlias) {

        if (typeof aliasPublico !== "string") {
            return res.status(400).json({ error: "Alias no válido." });
        }

        trimmedAlias = aliasPublico.trim();

        if (trimmedAlias.length < ALIAS_MIN_LENGTH || trimmedAlias.length > ALIAS_MAX_LENGTH) {
            return res.status(400).json({ error: `El alias debe tener entre ${ALIAS_MIN_LENGTH} y ${ALIAS_MAX_LENGTH} caracteres.` });
        }

    }

    if (hasLocalidad) {

        if (typeof localidad !== "string") {
            return res.status(400).json({ error: "Localidad no válida." });
        }

        trimmedLocalidad = localidad.trim();

        if (trimmedLocalidad.length > LOCALIDAD_MAX_LENGTH) {
            return res.status(400).json({ error: `La localidad no puede superar los ${LOCALIDAD_MAX_LENGTH} caracteres.` });
        }

    }

    const fields = [];
    const values = [];

    if (hasAlias) { fields.push("alias_publico = ?"); values.push(trimmedAlias); }
    // "" (vaciar el campo desde Editar perfil) se guarda como NULL, no
    // como cadena vacía -- mismo "sin dato real" que el resto de la app,
    // nunca una cadena vacía que luego el hero tendría que tratar como
    // "no hay localidad" en un sitio aparte.
    if (hasLocalidad) { fields.push("localidad = ?"); values.push(trimmedLocalidad || null); }

    values.push(req.userId);

    await pool.execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

    const responseBody = {};
    if (hasAlias) responseBody.aliasPublico = trimmedAlias;
    if (hasLocalidad) responseBody.localidad = trimmedLocalidad || null;

    res.json(responseBody);

}

authRouter.get("/perfil", requireAuth, getPerfil);
authRouter.patch("/perfil", requireAuth, updatePerfil);
