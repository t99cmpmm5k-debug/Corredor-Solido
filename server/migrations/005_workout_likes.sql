-- Likes de Comunidad (Fase 3b) -- "me gusta" a CUALQUIER entreno de
-- CUALQUIER usuario, incluido el propio. Referencia por `workout_id` suelto
-- (no una FK a `workouts.id`, que no es una clave única por sí sola --
-- workouts usa PRIMARY KEY (user_id, id), ver 001_init.sql) -- mismo
-- criterio que ya usa GET /api/community/entrenos/:id (server/src/routes/
-- community.js): trata el id de un entreno como suficientemente único en
-- la práctica (siempre un UUID generado por el cliente), sin duplicar aquí
-- un concepto nuevo de "clave compuesta" que el resto de esta feature no
-- necesita.
--
-- UNIQUE KEY (workout_id, user_id) -- la restricción real pedida ("un mismo
-- usuario no puede dar like dos veces al mismo entreno") vive en la base de
-- datos, no solo en el frontend: un POST duplicado choca aquí (ER_DUP_ENTRY),
-- que la ruta trata como éxito idempotente en vez de error real (ver
-- likeEntreno en community.js).
CREATE TABLE IF NOT EXISTS workout_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workout_id VARCHAR(64) NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_workout_user (workout_id, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sin índice aparte por workout_id a propósito -- el UNIQUE de arriba ya es
-- un índice compuesto (workout_id, user_id), y una búsqueda solo por
-- workout_id (contar likes de un entreno, saber si el usuario que pregunta
-- ya dio el suyo) ya puede usarlo como prefijo izquierdo; un segundo índice
-- solo duplicaría ese trabajo sin aportar nada.
