import crypto from "crypto";

// Token opaco de un solo uso (verificación de email / recuperación de
// contraseña) -- deliberadamente NO un JWT: necesita poder invalidarse de
// golpe borrando su fila de auth_tokens, algo que un JWT autocontenido no
// permite sin una lista de revocación aparte.
const TOKEN_BYTES = 32;

export function generateAuthToken() {

    return crypto.randomBytes(TOKEN_BYTES).toString("hex");

}

// sha256 basta aquí, no bcrypt: el token ya tiene 256 bits de entropía
// propios, el hash solo evita que una fuga de la tabla regale tokens
// usables directamente -- no hace falta el coste computacional de bcrypt,
// pensado para contraseñas de baja entropía elegidas por personas.
export function hashAuthToken(token) {

    return crypto.createHash("sha256").update(token).digest("hex");

}
