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
