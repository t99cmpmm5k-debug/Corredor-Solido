-- Dieta de la plantilla CSV (Nutrición, Gimnasio -- ver
-- src/utils/dietCsv.js del frontend): diet_plans, cada dieta importada;
-- diet_checks, un registro por día con qué opción se comió de cada comida;
-- diet_weekends, un registro por semana con qué día del fin de semana es la
-- tirada larga. Misma forma exacta que el resto de tablas de sync (JSON
-- completo por registro, last-write-wins con el reloj del servidor), para
-- reutilizar tal cual el pipeline genérico de routes/sync.js.

CREATE TABLE IF NOT EXISTS diet_plans (
    user_id INT NOT NULL,
    id VARCHAR(64) NOT NULL,
    data JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS diet_checks (
    user_id INT NOT NULL,
    id VARCHAR(64) NOT NULL,
    data JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS diet_weekends (
    user_id INT NOT NULL,
    id VARCHAR(64) NOT NULL,
    data JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
