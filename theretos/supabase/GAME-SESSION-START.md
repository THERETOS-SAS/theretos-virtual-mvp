# Inicio de partidas Core v1

`POST /api/game-sessions/start` crea una partida real. El envío posterior usa
la ruta independiente descrita en [GAME-SESSION-SUBMIT.md](GAME-SESSION-SUBMIT.md).
Todavía no hay conexión desde los juegos visuales, validación ni recompensas.

## Contrato HTTP

Usar la sesión Supabase existente mediante sus cookies y `Content-Type:
application/json`. El cuerpo admite exactamente estos dos campos:

```json
{ "game_slug": "atrapa-monedas", "mode": "practice" }
```

Los modos permitidos son `practice` y `competitive`. El slug debe tener hasta
100 caracteres de letras minúsculas, números y guiones entre segmentos. El
cuerpo tiene un límite de 4096 bytes. Se rechaza cualquier campo adicional,
incluidos `user_id`, `game_id`, `score`, resultados, métricas y timestamps.
Las peticiones del navegador deben venir del mismo origen; no se habilita CORS.

La respuesta `201` contiene únicamente `id`, `game_id`, `game_slug`, `status`,
`started_at` y `expires_at`. Todas las respuestas llevan `Cache-Control: no-store`.

| Estado HTTP | Error | Situación |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` / `INVALID_MODE` | JSON, campos, slug o modo inválidos |
| 401 | `UNAUTHENTICATED` | Sesión ausente o rechazada |
| 403 | `INVALID_REQUEST` | Origen no permitido |
| 404 | `GAME_NOT_FOUND` | Juego inexistente |
| 409 | `GAME_UNAVAILABLE` | Juego no disponible |
| 413 / 415 | `INVALID_REQUEST` | Cuerpo excesivo o tipo de contenido incorrecto |
| 503 | `START_UNAVAILABLE` | Fallo de Auth, configuración o base de datos |

Los errores devuelven `{ "error": "CODIGO", "message": "Mensaje público" }`,
sin mensajes internos de Supabase, credenciales ni datos del jugador.

## Identidad, escritura y permisos

La ruta reutiliza `lib/supabase/server.ts` para verificar las cookies mediante
`auth.getUser()`. Ese cliente también lee `public.games` por slug. El UUID del
usuario proviene exclusivamente de la respuesta autenticada de Supabase.

Un segundo cliente, aislado con `import "server-only"`, usa una Supabase Secret
Key mediante `SUPABASE_SECRET_KEY` y la URL `NEXT_PUBLIC_SUPABASE_URL`. No recibe cookies ni
tokens del jugador y no persiste ni refresca sesiones. Configurar la clave
únicamente en el entorno del servidor, nunca con prefijo `NEXT_PUBLIC_`.
No se añaden credenciales al repositorio ni se modifica `.env.local`.

`service_role` evita RLS, pero sigue necesitando los grants efectivos de la base:
`USAGE` sobre `public`, `SELECT` sobre `games` (también usado por el trigger),
`INSERT` sobre `game_sessions` y `SELECT` de los campos retornados. Core v1 no
concede ni revoca permisos a ese rol. El proyecto ya tiene `USAGE` sobre `public`.
La migración `202610150001_game_session_server_grants.sql` concede únicamente
`SELECT` sobre `public.games` e `INSERT, SELECT` sobre `public.game_sessions` a
`service_role`. No concede `UPDATE` ni `DELETE`, ni permisos a `anon` o
`authenticated`; tampoco modifica RLS, policies, triggers, funciones, tablas
ni ledgers. Aplicar esta migración antes de activar la ruta.

El INSERT envía solo `user_id`, `game_id`, `mode`, `status: "started"`,
`started_at` y `expires_at`. Ambos timestamps se calculan en el servidor;
la vigencia es de **15 minutos** desde el inicio. Los demás campos conservan los
defaults de Core. La FK exige progreso existente y el trigger vuelve a comprobar
que el juego esté disponible y que la sesión nazca sin resultados. Un fallo no
crea ni repara progreso y no modifica ledgers.

No hay reintentos automáticos del INSERT. Cada POST válido representa una nueva
partida; esta fase no añade idempotencia, límites de partidas ni un proceso que
cambie automáticamente las sesiones vencidas a `expired`.

## Verificación

`tests/start-game-session.test.mjs` usa clientes Supabase reales con HTTP
interceptado para probar el handler. La suite Core existente verifica la
migración y sus triggers en PGlite. Ninguna prueba certifica los permisos del
proyecto alojado ni crea partidas remotas. Falta validar la ruta con una sesión
real y las credenciales exclusivas del servidor configuradas.
