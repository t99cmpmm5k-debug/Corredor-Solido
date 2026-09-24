-- Localidad (Perfil, rediseño 2026-09-25): texto libre y opcional que el
-- usuario escribe a mano para el hero de Perfil ("Murcia", "Cartagena"...)
-- -- nunca inferida de GPS ni de los entrenos, solo lo que él mismo
-- ponga. NULL por defecto -- no toca ninguna fila ni columna existente
-- (misma política de nunca romper el esquema ya establecida, ver
-- 004_alias_publico.sql).
ALTER TABLE users ADD COLUMN localidad VARCHAR(100) NULL;
