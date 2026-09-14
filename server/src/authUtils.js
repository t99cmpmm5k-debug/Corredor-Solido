import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Coste de hashing de bcrypt -- 12 es el estándar actual recomendado
// (más alto = más lento de calcular, más resistente a fuerza bruta si se
// filtrara la base de datos; 12 es un equilibrio razonable en 2026).
const BCRYPT_ROUNDS = 12;

// Los tokens caducan -- si se filtra uno, deja de ser válido pasado este
// tiempo. 30 días porque es una app que se abre a diario, no se quiere
// pedir login constantemente.
const TOKEN_EXPIRY = "30d";

export function hashPassword(plainPassword) {
    return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

export function verifyPassword(plainPassword, passwordHash) {
    return bcrypt.compare(plainPassword, passwordHash);
}

export function signToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Lanza si el token es inválido o ha caducado -- quien llame debe
// capturarlo (ver middleware/auth.js), nunca asumir que siempre resuelve.
export function verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
}
