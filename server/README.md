# Corredor Sólido — backend de sincronización

API mínima: registro/login (email + contraseña) y sincronización de datos
por usuario, reutilizando el mismo formato JSON que ya produce "Exportar
mis datos" en el cliente (`src/utils/backup.js` del frontend).

## Puesta en marcha

1. `npm install`
2. Crea la base de datos y aplica el esquema, en orden:
   ```
   mysql -u TU_USUARIO -p TU_BASE_DE_DATOS < migrations/001_init.sql
   mysql -u TU_USUARIO -p TU_BASE_DE_DATOS < migrations/002_auth_tokens.sql
   mysql -u TU_USUARIO -p TU_BASE_DE_DATOS < migrations/003_tombstones.sql
   mysql -u TU_USUARIO -p TU_BASE_DE_DATOS < migrations/004_alias_publico.sql
   mysql -u TU_USUARIO -p TU_BASE_DE_DATOS < migrations/005_workout_likes.sql
   ```
3. Copia `.env.example` a `.env` y rellena los valores reales (credenciales
   de la base de datos ya creadas en Hestia, un `JWT_SECRET` largo y
   aleatorio, y las credenciales de Resend para el envío de emails — nunca
   subas `.env` al repo, ya está en `.gitignore`).
4. `npm start` (o `npm run dev` para que se reinicie solo al cambiar código).

## Endpoints

- `POST /api/auth/registro` — `{ email, password }` → `{ pendingVerification: true }` (201). No da acceso todavía — envía un email de verificación. Si el email ya existe pero sigue sin verificar, reenvía un enlace nuevo en vez de dar error.
- `POST /api/auth/login` — `{ email, password }` → `{ token }`. Si la cuenta no está verificada, `403 { error, code: "EMAIL_NOT_VERIFIED" }` en vez de token.
- `POST /api/auth/verificar` — `{ token }` (el de `?verify_token=` del email) → `{ token }` (JWT de sesión, ahora sí). Marca la cuenta como verificada.
- `POST /api/auth/reenviar-verificacion` — `{ email }` → `{ ok: true }` siempre (exista la cuenta, esté verificada o no — no revela nada). Reenvía el email de verificación si aplica.
- `POST /api/auth/recuperar` — `{ email }` → `{ ok: true }` siempre. Envía un email con enlace de recuperación si la cuenta existe.
- `POST /api/auth/restablecer` — `{ token, nuevaPassword }` (el `token` de `?reset_token=` del email) → `{ ok: true }`. Cambia la contraseña.
- `GET /api/sync` (header `Authorization: Bearer <token>`) — devuelve todo lo guardado del usuario
- `POST /api/sync` (mismo header) — recibe `{ workouts, shoes, plannedSessions, gymSessions, referenceRoutes }` (el mismo JSON de "Exportar mis datos") y lo guarda/fusiona por `id`
- `GET /api/tiles/satellite/:z/:y/:x` (sin auth — Leaflet la carga como `<img>`, no puede mandar el JWT) — proxy de relay puro hacia Esri World Imagery (`ver src/routes/tiles.js`): guarda `ESRI_API_KEY` solo en este servidor, nunca en el frontend, y no persiste ningún tile en el propio VPS (ver el comentario de esa ruta sobre los términos de Esri). Sin `ESRI_API_KEY` configurada responde `503` en vez de romper el arranque — es una capa visual opcional.
- `GET /api/community/entrenos` (header `Authorization: Bearer <token>`) — Fase 0 de la feature "Comunidad": entrenos de **todos** los usuarios registrados (no solo el propio), reducidos a una lista blanca de campos (`ver src/routes/community.js`) — nunca email/password/tokens. Sin filtro de fecha (lo decide cada pantalla que lo consuma). Estructura de cada entreno: `{ alias, id, type, date, distanceKm, avgPaceSecPerKm, durationSec, likesCount, likedByMe, routeTrace?, avgHr?, z2TimeInZonePercent? }` — `routeTrace` solo si el entreno tiene GPS real (2+ puntos); `avgHr` y `z2TimeInZonePercent` solo si `type === "easy"` (Z2); `likesCount`/`likedByMe` (Fase 3b) van **siempre**, incluso a `0`/`false` — a diferencia de los anteriores, "0 likes" es un estado real, no una ausencia de dato. `z2TimeInZonePercent` (Fase 2, Ranking) es una **aproximación**, no un tiempo en zona real medido segundo a segundo (la app no captura eso de ningún entreno) — % del tiempo estimado del entreno (cada split de `workout.splits` pesado por `distanceKm * paceSecPerKm`, no contado como split suelto) con `avgHr` dentro de un rango FIJO de 130–150 ppm igual para toda la comunidad (sin perfil de FC máxima/reposo por usuario, confirmado con el usuario). Sin splits reales con FC → no se incluye el campo, nunca un valor inventado. `alias` es `alias_publico` (ver más abajo) si el usuario ya lo configuró en Perfil, o si no la parte local de su email (antes de la `@`) como respaldo provisional.
- `GET /api/community/entrenos/:id` (mismo header) — detalle completo de UN entreno, de **cualquier** usuario (a diferencia de `/api/sync`, aquí no se filtra por `req.userId` — Comunidad ya es abierta por diseño). Mismos campos que la lista de arriba (sin `likesCount`/`likedByMe`, ese detalle no los expone) más `splits`: `[{ lap, distanceKm, paceSecPerKm, avgHr, maxHr, segmentType }]` (mismo `workout.splits` que ya guarda el entreno, sin ningún formato nuevo — `maxHr`/`segmentType` solo los trae Garmin, quedan `null` para GPX/TCX). Pensado para el mapa fullscreen del feed (coloreado por ritmo real + marcadores de km). `id` inexistente → `404 { error }`, nunca `500`.
- `POST /api/community/entrenos/:id/like` (mismo header) — da like al entreno `:id` en nombre del usuario del token, **cualquier** entreno de cualquier usuario, incluido el propio (Fase 3b). → `{ liked: true, likesCount }`. Un segundo POST del mismo usuario al mismo entreno es idempotente (la restricción real de "no duplicar" es el `UNIQUE (workout_id, user_id)` de `workout_likes`, `migrations/005_workout_likes.sql` — un choque con él se trata como éxito, no como error).
- `DELETE /api/community/entrenos/:id/like` (mismo header) — quita el like propio de ese entreno → `{ liked: false, likesCount }`. Idempotente por definición (quitar un like que no existía no es un error).
- `GET /api/auth/perfil` (header `Authorization: Bearer <token>`) — `{ aliasPublico }` (`null` si todavía no se ha configurado) del usuario del propio token, nunca de otro.
- `PATCH /api/auth/perfil` (mismo header) — `{ aliasPublico }` → `{ aliasPublico }` (ya recortado). Guarda el alias público (Comunidad, `migrations/004_alias_publico.sql`) del usuario del propio token — no hay forma de editar el de otro, `req.userId` sale siempre del JWT verificado, nunca del cuerpo de la petición. Validación: 2-50 caracteres tras `trim()`, `400` si no cumple.

Los tokens de `verificar`/`restablecer` son opacos de un solo uso (no JWT),
guardados con hash en `auth_tokens` (`purpose` distingue cuál es cuál) —
ver `migrations/002_auth_tokens.sql` y `src/tokenUtils.js`. Verificación
caduca a las 24h, recuperación a la 1h. Reenviar/pedir uno nuevo invalida
el anterior del mismo tipo.

## Regla de conflicto (last-write-wins por reloj del servidor)

Cada fila guarda `updated_at`, puesto siempre con `NOW()` del propio
servidor en el momento de la escritura — nunca con un timestamp que venga
del móvil/PC. Si el mismo registro (mismo `id`) llega en dos sincronizados
distintos, gana el que el servidor procesó último.

Esto evita bugs por relojes de dispositivo mal ajustados, a cambio de una
limitación aceptada conscientemente para esta primera versión: si el mismo
registro se edita en dos dispositivos SIN que ninguno haya sincronizado
todavía, el segundo en sincronizar se queda con la versión guardada — no
hay fusión campo a campo ni aviso de conflicto. Con un grupo de usuarios
pequeño (beta), este choque real es poco probable; si en la práctica
resulta serlo, se revisa entonces (no antes).

## Migración inicial

No existe un endpoint aparte de "importar histórico". La primera vez que
un usuario nuevo llama a `POST /api/sync`, el servidor está vacío para él
— así que enviar ahí todo el histórico local (el mismo JSON de "Exportar
mis datos") ES la migración, con el mismo mecanismo de guardado por `id`
que cualquier sync normal.

## Por qué cada registro se guarda como JSON completo, no columna a columna

Los objetos reales (`workout`, `gymSession`...) tienen bastantes campos
opcionales que van cambiando con el tiempo (`splits`, `fieldMeta`,
`importWarnings`...). Guardarlos como JSON completo evita tener que tocar
el esquema de la base de datos cada vez que el cliente añade un campo
nuevo — coherente con cómo ya se guardan en IndexedDB en el propio
cliente.

## Pendiente (no implementado a propósito en esta primera versión)

- Fusión campo a campo o aviso de conflicto real (ver arriba).
- Borrado de cuenta / borrado de datos individuales vía API (hoy el sync
  solo añade/actualiza, nunca borra en el servidor algo que desapareciera
  en local).
- Revocación de sesión: los JWT no se invalidan en servidor (30 días de
  vida, ver `authUtils.js`) — restablecer la contraseña no cierra sesiones
  ya abiertas en otros dispositivos con el token viejo.

## Vulnerabilidad conocida y aceptada (no corregida a propósito)

`npm audit` marca una vulnerabilidad moderada (DoS) en `qs`, una
dependencia interna de Express usada para parsear query strings complejas
(`?a[]=1&a[]=2`). La única corrección real es saltar a Express 5.x (cambios
de API, no es un simple parche). Se deja sin corregir de forma consciente
porque esta API no usa query strings en ningún sitio (solo JSON en el
cuerpo de la petición) — el riesgo real para esta app concreta es
prácticamente nulo. Revisar si se añade algún endpoint con query params
complejos en el futuro.
