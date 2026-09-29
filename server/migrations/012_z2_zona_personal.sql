-- Zona 2 personal (Perfil, 2026-09-29): rango de pulsaciones (ppm) que
-- cada usuario define a mano como SU Zona 2 -- lo usa el % de tiempo en
-- zona del Ranking de Comunidad (routes/community.js) en lugar del rango
-- fijo 130-150 igual para todos. Los dos NULL por defecto: un usuario que
-- no lo configura sigue usando ese rango fijo (ver server/src/z2Zone.js),
-- nadie pierde su cálculo actual. Siempre se guardan los dos a la vez o
-- ninguno (lo garantiza PATCH /api/auth/perfil). No toca ninguna fila ni
-- columna existente (misma política que 004_alias_publico.sql/011).
ALTER TABLE users
    ADD COLUMN z2_min_bpm SMALLINT UNSIGNED NULL,
    ADD COLUMN z2_max_bpm SMALLINT UNSIGNED NULL;
