-- Nutrición (Gimnasio): un registro por alimento añadido a un día (nombre,
-- cantidad en g/ml, comida y los valores por 100 g de Open Food Facts
-- copiados al añadirlo). En el sync desde el primer día, misma forma exacta
-- que el resto de tablas de sync (JSON completo por registro, last-write-
-- wins con el reloj del servidor), para reutilizar tal cual el pipeline
-- genérico de routes/sync.js.

CREATE TABLE IF NOT EXISTS nutrition_entries (
    user_id INT NOT NULL,
    id VARCHAR(64) NOT NULL,
    data JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
