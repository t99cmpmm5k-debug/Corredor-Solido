-- Composición corporal (Gimnasio): registros manuales con fecha -- peso
-- obligatorio, % grasa/agua/músculo opcionales (null si no se registran).
-- En el sync desde el primer día, misma forma exacta que el resto de
-- tablas de sync (JSON completo por registro, last-write-wins con el reloj
-- del servidor), para reutilizar tal cual el pipeline genérico de
-- routes/sync.js.

CREATE TABLE IF NOT EXISTS body_composition (
    user_id INT NOT NULL,
    id VARCHAR(64) NOT NULL,
    data JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
