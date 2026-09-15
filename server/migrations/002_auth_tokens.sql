-- Verificación de email obligatoria + recuperación de contraseña.
--
-- Una sola tabla para los dos flujos (misma forma exacta: token opaco de
-- un solo uso, hash guardado, expiración, ligado a un usuario) en vez de
-- dos tablas casi idénticas -- `purpose` distingue para qué sirve cada
-- fila. Confirmado con el usuario (ver plan de conexión al backend).

ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP NULL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    purpose ENUM('email_verification', 'password_reset') NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Una consulta por (user_id, purpose) en cada emisión/consumo de token --
-- índice compuesto para no escanear la tabla entera según crezca.
CREATE INDEX idx_auth_tokens_user_purpose ON auth_tokens(user_id, purpose);
