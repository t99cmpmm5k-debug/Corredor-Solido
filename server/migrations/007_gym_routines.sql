-- Rutinas de gimnasio en el sync (antes solo vivían en el IndexedDB del
-- dispositivo: cambiar de móvil o borrar datos las perdía, a diferencia de
-- las sesiones de gimnasio, que ya se sincronizaban -- gym_sessions en
-- 001_init.sql). Misma forma exacta que el resto de tablas de sync (JSON
-- completo por registro, last-write-wins con el reloj del servidor), para
-- reutilizar tal cual el pipeline genérico de routes/sync.js.

CREATE TABLE IF NOT EXISTS gym_routines (
    user_id INT NOT NULL,
    id VARCHAR(64) NOT NULL,
    data JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
