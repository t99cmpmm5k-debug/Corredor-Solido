-- Comentarios de Comunidad (Fase 3c) -- comentar CUALQUIER entreno, de
-- cualquier usuario. Mismo criterio que workout_likes (005_workout_likes.sql):
-- referencia por `workout_id` suelto (id de cliente, tratado como único en
-- la práctica), no una FK a `workouts.id` (no es una clave única por sí
-- sola -- workouts usa PRIMARY KEY (user_id, id), ver 001_init.sql).
--
-- Sin UNIQUE (a diferencia de workout_likes) -- un usuario SÍ puede dejar
-- varios comentarios en el mismo entreno, eso es normal en cualquier hilo
-- de comentarios.
CREATE TABLE IF NOT EXISTS workout_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workout_id VARCHAR(64) NOT NULL,
    user_id INT NOT NULL,
    text VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A diferencia de workout_likes, aquí SÍ hace falta un índice propio por
-- workout_id -- sin un UNIQUE (workout_id, ...) que ya empiece por esa
-- columna, listar los comentarios de un entreno (o contarlos para
-- GET /api/community/entrenos) escanearía la tabla entera según crezca.
CREATE INDEX idx_workout_comments_workout ON workout_comments(workout_id);
