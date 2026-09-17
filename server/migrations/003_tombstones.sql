-- Tombstones para propagar borrados reales entre dispositivos.
--
-- Bug real corregido: el POST /api/sync siempre fue puramente aditivo
-- (INSERT ... ON DUPLICATE KEY UPDATE, ver 001_init.sql) -- nunca borraba
-- nada. Un entreno (o sesión planificada / de gimnasio / recorrido de
-- referencia) que ya se había subido antes de borrarlo en local seguía
-- viviendo en su tabla para siempre, y el próximo pull lo devolvía
-- (resucitado) porque GET /api/sync devuelve todo lo que hay.
--
-- Misma forma que el resto de tablas de sync (id compuesto
-- "storeKey:recordId" generado en el cliente, JSON completo en `data`)
-- para reutilizar tal cual el mismo pipeline genérico de
-- INSERT ... ON DUPLICATE KEY UPDATE de las demás SYNC_TABLES -- ver
-- routes/sync.js para el paso EXTRA que solo esta tabla dispara (borrar de
-- verdad la fila real referenciada en su tabla de origen).

CREATE TABLE IF NOT EXISTS deleted_records (
    user_id INT NOT NULL,
    id VARCHAR(80) NOT NULL,
    data JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
