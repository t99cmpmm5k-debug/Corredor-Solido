import { Router } from "express";
import { pool } from "../db.js";
import { hashPassword, verifyPassword, signToken } from "../authUtils.js";

export const authRouter = Router();

const MIN_PASSWORD_LENGTH = 8;

function isValidEmail(email) {
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

authRouter.post("/registro", async (req, res) => {

    const { email, password } = req.body ?? {};

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Email no válido." });
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await hashPassword(password);

    try {

        const [result] = await pool.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            [normalizedEmail, passwordHash]
        );

        res.status(201).json({ token: signToken(result.insertId) });

    } catch (err) {

        // ER_DUP_ENTRY -- ya existe una cuenta con ese email (índice único
        // en la tabla). Nunca revela SI existe realmente por seguridad
        // (mismo mensaje genérico que un fallo de login), solo que no se
        // pudo completar el registro con esos datos.
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
        }

        throw err;

    }

});

authRouter.post("/login", async (req, res) => {

    const { email, password } = req.body ?? {};

    if (!isValidEmail(email) || typeof password !== "string") {
        return res.status(400).json({ error: "Email o contraseña no válidos." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [rows] = await pool.execute(
        "SELECT id, password_hash FROM users WHERE email = ?",
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

    res.json({ token: signToken(user.id) });

});
