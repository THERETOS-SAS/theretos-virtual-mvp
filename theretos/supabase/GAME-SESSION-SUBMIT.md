# Envío de resultados Core v1

`POST /api/game-sessions/submit` registra el resultado de una partida propia y
vigente mediante la transición `started` → `submitted`. El resultado permanece
sin verificar: esta ruta no valida partidas ni concede XP, eTickets o premios.
No conecta los juegos visuales, rankings o torneos ni escribe en los ledgers.

## Contrato HTTP

Usar las cookies de la sesión Supabase existente y `Content-Type: application/json`.
Las peticiones del navegador deben venir del mismo origen. El cuerpo JSON tiene
un máximo de 4096 bytes UTF-8 y admite únicamente:

```json
{
  "session_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "score": 25,
  "duration_ms": 1000,
  "metrics": { "hits": 5 }
}
```

`session_id` debe ser un UUID con guiones. `score` y `duration_ms` son obligatorios:
enteros entre 0 y `Number.MAX_SAFE_INTEGER` (9007199254740991), sin strings ni
redondeo. `metrics` es opcional y debe ser un objeto JSON; si se omite se guarda
`{}`. Sus datos son declaraciones no verificadas y nunca determinan identidad,
estado o recompensas. No se acepta `client_version` ni ningún otro campo extra,
incluidos `user_id`, `game_id`, `status`, timestamps, XP, eTickets o rewards.

La respuesta `200` contiene exactamente `id`, `status: "submitted"`, `score`,
`duration_ms` y `submitted_at`. No devuelve `user_id`, `metrics`, credenciales
ni metadata interna. Las respuestas del handler llevan `Cache-Control: no-store`.

| HTTP | Error | Situación |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | JSON, campos, UUID, score, duración o metrics inválidos |
| 401 | `UNAUTHENTICATED` | Sesión ausente o rechazada por Auth |
| 403 | `INVALID_REQUEST` | Origen no permitido |
| 404 | `SESSION_NOT_FOUND` | Partida inexistente o perteneciente a otro usuario |
| 409 | `SESSION_NOT_STARTED` | La partida ya no está en `started` |
| 409 | `SESSION_EXPIRED` | La partida está vencida al comprobarla |
| 409 | `SESSION_NOT_SUBMITTABLE` | El UPDATE ya no encuentra una fila elegible o Core rechaza el cambio con `23514` |
| 413 / 415 | `INVALID_REQUEST` | Cuerpo demasiado grande o tipo de contenido incorrecto |
| 503 | `SUBMIT_UNAVAILABLE` | Error de Auth, configuración, red, permisos o base de datos |

Los errores contienen solamente `{ "error": "CODIGO", "message": "Mensaje público" }`.
No se incluyen los mensajes, detalles ni hints de Supabase/PostgreSQL.

## Identidad y escritura

La ruta delega en `lib/games/submit-session.ts`. El cliente SSR existente de
`lib/supabase/server.ts` autentica mediante `auth.getUser()`, única fuente del
UUID del jugador. Con ese mismo cliente y RLS se lee `public.game_sessions`,
filtrando tanto `id` como `user_id`. El servidor vuelve a comprobar propietario,
estado `started` y `expires_at`; una partida ajena tiene el mismo 404 que una
inexistente.

Solo después se crea el writer existente de
`lib/supabase/game-session-writer.ts`, protegido por `import "server-only"`.
La Secret Key sigue utilizándose únicamente allí, sin cookies ni tokens del
jugador. No se añade otra clave, cliente privilegiado o variable de entorno.

El PATCH escribe exclusivamente `status: "submitted"`, `score`, `duration_ms`
y `metrics`. Su WHERE incluye `id`, `user_id` autenticado, `status = started`
y `expires_at >` la hora del servidor tomada al construir la escritura. Estos
predicados forman parte del UPDATE atómico: una lectura anterior no autoriza
sobrescribir un resultado que ya fue enviado. Cero filas produce 409. No hay
reintentos automáticos del PATCH.

## Comportamiento exacto de Core

Se conserva `202610070001_theretos_core_v1.sql` sin modificaciones:

- `guard_game_session` impide modificar `id`, `user_id`, `game_id`, `mode`,
  `started_at`, `expires_at` y `created_at`.
- Impide asignar directamente `submitted_at` o `validated_at`. Impide cambiar
  resultados sin transición de estado y protege los estados terminales.
- Admite `started` → `submitted`. Antes de aceptarlo compara
  `clock_timestamp() >= OLD.expires_at`; si se cumple lanza `23514` y revierte
  la sentencia. Después asigna `NEW.submitted_at := clock_timestamp()`.
- Las constraints exigen score y duración no nulos y no negativos, metrics
  de tipo objeto JSON, y `submitted_at >= started_at`. `validated_at` permanece
  nulo. El trigger separado `set_updated_at` asigna `updated_at`.
- No convierte automáticamente el envío en `validated`, `rejected` o `expired`.
  El trigger de conteo solo actúa al entrar en `validated`, por lo que este envío
  no cambia progreso ni ledgers.

## Permisos mínimos propuestos

La nueva migración `202610150002_game_session_submit_grants.sql` contiene:

```sql
begin;

grant update (status, score, duration_ms, metrics)
on table public.game_sessions to service_role;

commit;
```

Presupone `USAGE` en `public` y los grants de inicio existentes. El `SELECT`
existente permite filtros y retorno de columnas. No concede UPDATE general,
permisos sobre timestamps u otras columnas, ni nuevos permisos a `anon` o
`authenticated`. Las asignaciones a `NEW` de los triggers funcionan sin grants
UPDATE sobre `submitted_at` y `updated_at`, comprobado con Core real en PGlite.
No requiere permisos adicionales sobre funciones Core. Los grants de columna
no restringen valores: el endpoint fija `submitted`, y Core controla transiciones.
PostgREST admite [permisos UPDATE por columna](https://docs.postgrest.org/en/v16/explanations/db_authz.html#tables).

Esta migración se propone para revisión y **no se ha aplicado a Supabase**.
Con los permisos actuales, el UPDATE devuelve un error público 503 y no se
intenta ampliar privilegios. Si el entorno alojado requiere permisos más
amplios, detener la activación e inspeccionar el bloqueo antes de concederlos.

## Verificación y límites

`tests/submit-game-session.test.mjs` comprueba autenticación, pertenencia,
validación del contrato, expiración, duplicados/carreras simuladas, construcción
del PATCH con el SDK real y respuestas seguras mediante HTTP interceptado.
`tests/game-session-submit-grants.test.mjs` ejecuta Core y ambas migraciones de
grants en PGlite: verifica permisos de columna efectivos, triggers, constraints,
rechazo de escrituras ajenas al permiso y ausencia de efectos en progreso/ledgers.

Estas pruebas no certifican el PostgREST alojado ni carreras entre conexiones
PostgreSQL reales. No se han hecho peticiones a un proyecto Supabase remoto.
Core usa el reloj de la base como barrera final de expiración; una diferencia
con el reloj del servidor puede causar un rechazo conservador.

Un fallo de red después del commit puede devolver 503 aunque la partida haya
quedado `submitted`; un nuevo envío no vuelve a escribirla. La ruta no ofrece
repetición idempotente de la respuesta. Tampoco certifica que el score, la duración
o las métricas sean legítimos; esa validación queda pendiente de una fase posterior.
