# THERETOS Core v1

Fundación de persistencia para THERETOS 2.0, gratuito y sin entrada pagada. Los
tickets son unidades internas: no son dinero, no se retiran ni se compran para
competir. Esta entrega prepara la base de datos; los juegos y la UI continúan con
sus datos demo. **Esta revisión no ejecuta nada contra Supabase.** El intento
anterior en `theretos-2-dev` abortó al encontrar el catálogo legado; no hay una
instalación Core exitosa conocida. Por eso se corrige el archivo de la migración
antes de su primera instalación real.

Archivos operativos:

- [Migración versionada](migrations/202610070001_theretos_core_v1.sql).
- [Inspección de solo lectura](inspect-theretos-core.sql), utilizable antes y después.

## Adopción del esquema legado

En `theretos-2-dev` ya existen `public.games` y `public.game_sessions`.
El catálogo usa `id UUID`, `slug`, `name`, `status`, `created_at` y
`updated_at`. Las cinco filas observadas tienen estado `active`:

| Slug | UUID que se conserva |
| --- | --- |
| `atrapa-monedas` | `339b4240-92f8-48d7-b798-0b50fd05130e` |
| `tap-frenetico` | `77141165-b5ba-4388-b712-08e0232798e8` |
| `revienta-globos` | `3ba763c6-4e57-4d30-bef9-89a9b3c7b3c1` |
| `golpea-topos` | `8989273d-40dd-400f-92a0-984c50326df5` |
| `bolas` | `64025093-de9a-49e8-a4c4-42bfd7fd907c` |

La migración adopta la tabla existente: conserva `id`, `slug`, `name` y
`created_at` de cada juego. Convierte `active` a `available`, mantiene la PK
UUID y garantiza `UNIQUE(slug)`. No borra ni reemplaza `games`; solamente
inserta `tiro-perfecto` y `memoria-flash` si faltan, con UUID generados y
estado `coming-soon`. No sobrescribe sus UUID si ya existen.

Las sesiones legadas usan `game_id UUID REFERENCES public.games(id)`. Se
conserva esa relación porque el UUID es la identidad interna del juego y el
slug es su identificador público estable. El futuro servidor resolverá el slug
contra `games` antes de crear una sesión; no se introduce `game_slug`.

El conteo de sesiones observado es cero. La migración vuelve a comprobarlo
**después de un bloqueo ACCESS EXCLUSIVE y dentro de la misma transacción**,
con `row_security = off` para no ocultar filas mediante RLS. Si aparece una
sola fila, aborta y conserva todos los datos. Solo tras confirmar cero filas,
reconstruye `public.game_sessions` sin `CASCADE`, conservando su nombre y
creando las restricciones Core. Los modos legados `practice/tournament/mission`
y los estados `started/completed/cancelled/invalid` desaparecen; no hay sesiones
históricas que convertir.

La policy legada `Anyone can view active games` se reemplaza para permitir leer
el catálogo nuevo. Se elimina `Users can start own game sessions` y se revocan
los permisos de inserción de tabla y columna del navegador. La lectura propia
queda bajo las policies Core. Inicio, envío y validación de sesiones quedan
reservados a una futura implementación de servidor con identidad autenticada.

El preflight admite tres situaciones: instalación nueva sin objetos Core,
las dos tablas legadas compatibles juntas, o Core UUID completo con sus
huellas intactas. Detecta instalaciones parciales y rechaza el Core anterior
con PK de slug. La nueva marca de esquema es `theretos-core-v1-uuid`.

El snapshot legado disponible no incluye todos los tipos, defaults, índices
y dependencias. Deben revisarse en la inspección manual antes de instalar.
El preflight exige `text` para slug/nombre/estados/modo, `timestamptz` para fechas
y UUID para identidades. En sesiones se esperan `id`, `user_id`, `game_id`,
`mode`, `status`, `score` y `duration_ms`; score y duración pueden ser `integer`
o `bigint`. Se admiten los timestamps legados `started_at`, `completed_at`,
`created_at` y `updated_at`.

Los índices legados deben ser btree simples, sin expresiones ni predicados;
un índice único debe respaldar una constraint reconocida. Los defaults del
catálogo se comparan con una lista cerrada de expresiones UUID, fecha y estado
conocidas; no se ejecutan defaults arbitrarios. Columnas, triggers u otras
estructuras desconocidas hacen abortar la adopción. Una dependencia que impida
reconstruir sesiones también aborta; no se elimina con `CASCADE`. Los fixtures
locales completan metadata no observada con supuestos explícitos, como defaults
y el CHECK `active/inactive` de juegos; no certifican el esquema remoto completo.

Ante una estructura no reconocida, datos incompatibles o conflicto inesperado,
se produce `RAISE EXCEPTION` y rollback completo. No se reparan objetos a
ciegas y no se borra `profiles` ni `auth`.

## Arquitectura

| Tabla pública | Responsabilidad y restricciones principales |
| --- | --- |
| `games` | `id UUID` como PK, `slug` público único; nombre no vacío; estados `available`, `coming-soon`, `disabled`. |
| `player_progress` | Una fila por `profiles.id`; XP, tickets y partidas no negativos; nivel al menos 1. |
| `game_sessions` | Sesiones propias con `game_id UUID` → `games(id)`; modo `practice` o `competitive`; resultado y ciclo de vida. |
| `xp_ledger` | Movimientos de XP estrictamente positivos, con motivo y `event_key` único por ledger. |
| `tickets_ledger` | Movimientos de tickets positivos o negativos, nunca cero; motivo y `event_key` único por ledger. |

Todas las tablas llevan `created_at`; catálogo, progreso y sesiones también llevan
`updated_at`, actualizado mediante trigger. Los identificadores de juego, sesión y
movimiento son UUID. Las FK usan `ON UPDATE RESTRICT` y `ON DELETE RESTRICT`.
`player_progress` referencia `profiles`; sesiones y movimientos referencian
`player_progress`. La FK compuesta `(game_session_id, user_id)` exige que una
recompensa vinculada a sesión pertenezca al mismo usuario.
Referencia: [restricciones de PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html).

Los siete slugs finales coinciden con `allMockGames` en `data/mockGames.ts`.
Los nombres de las cinco filas legadas se conservan, aunque difieran del catálogo
demo. No se modifica ese catálogo de la aplicación.

| Slug | Nombre | Estado inicial |
| --- | --- | --- |
| `atrapa-monedas` | Atrapa Monedas | `available` |
| `tap-frenetico` | Tap Frenético | `available` |
| `revienta-globos` | Revienta Globos | `available` |
| `golpea-topos` | Golpea Topos | `available` |
| `bolas` | Bolas | `available` |
| `tiro-perfecto` | Tiro Perfecto | `coming-soon` |
| `memoria-flash` | Memoria Flash | `coming-soon` |

El trigger de inserción en `profiles` crea progreso en cero y nivel 1. El backfill
crea únicamente las filas faltantes; no importa XP, tickets o historial de
`localStorage`. El seed usa `ON CONFLICT DO NOTHING`: una repetición conserva
UUID, nombres, fechas originales, estados y progreso existentes. No hay fórmula
de nivel en v1; ganar XP no modifica automáticamente el nivel.

## Contabilidad y concurrencia

Un ledger es el registro de cada movimiento, con `amount`, `reason`, `event_key`
y fecha. `tickets_ledger` es la fuente contable; `tickets_balance` es el saldo
consolidado para lecturas rápidas. De la misma manera, `xp_total` se deriva de
`xp_ledger`. Un cambio manual del saldo perdería la explicación de su origen:
las futuras escrituras autorizadas deben insertar movimientos y dejar que los
triggers actualicen los agregados.

Cada inserción aplica el movimiento mediante un trigger `AFTER INSERT` dentro de
la misma transacción. Si falta progreso, se excede `bigint`, la sesión vinculada
no está validada o un débito dejaría saldo negativo, la operación completa falla.
La actualización del saldo bloquea la fila y comprueba el saldo resultante en el
propio `UPDATE`, evitando que dos débitos concurrentes gasten el mismo saldo.

`event_key` es obligatorio, no vacío y único **dentro de cada ledger**. El futuro
servidor deberá generar claves estables para el mismo evento: por ejemplo,
`session:<uuid>:xp:v1`. Reintentar un `INSERT` normal duplicado falla; con
`ON CONFLICT DO NOTHING` no se ejecuta el trigger `AFTER INSERT` de una fila omitida.
Además, `UNIQUE(game_session_id)` permite una sola recompensa de XP y una sola de
tickets por sesión, incluso usando una clave diferente; admite varios eventos
independientes con sesión `NULL`. Un movimiento de tickets
vinculado a sesión debe ser positivo; los débitos futuros, por ejemplo un canje,
serán eventos independientes sin `game_session_id`.

Los ledgers bloquean `UPDATE`, `DELETE` y `TRUNCATE` mediante triggers. Una
corrección de tickets debe ser un nuevo movimiento compensatorio; no se borra el
anterior. XP v1 no admite correcciones negativas. El propietario de la base puede
alterar o desactivar protecciones: los triggers no sustituyen el control del
acceso administrativo. Las escrituras privilegiadas futuras deben respetar la
contabilidad y utilizar transacciones cuando validación y premios deban ser
atómicos entre sí.

## Sesiones

Campos finales: `id UUID` (PK), `user_id UUID`, `game_id UUID`, `mode`,
`status`, `score`, `duration_ms`, `metrics jsonb`, `client_version`,
`rejection_reason`, `started_at`, `submitted_at`, `validated_at`,
`expires_at`, `created_at` y `updated_at`. `user_id` referencia
`player_progress(user_id)`, que a su vez exige un perfil existente. El servidor
futuro debe derivarlo de la sesión autenticada, nunca aceptarlo como autoridad
del navegador.

Una sesión nace únicamente como `started`, sin resultado ni fechas de envío o
validación, para un juego `available`. El escritor autorizado debe fijar un
`expires_at` futuro y posterior a `started_at`. Identidad, usuario, juego, modo,
inicio, vigencia y fecha de creación son inmutables.

Transiciones admitidas:

- `started` → `submitted`, `rejected` o `expired`.
- `submitted` → `validated`, `rejected` o `expired`.
- `validated`, `rejected` y `expired` son terminales: no permiten cambiar datos.

`submitted` exige score y duración no negativos; `metrics` debe ser un objeto
JSON. El trigger genera `submitted_at` y `validated_at`. Una sesión vencida no se
puede enviar; solo se puede marcar `expired` una vez vencida. La validación de
un envío ya recibido puede procesarse después del vencimiento. No hay un job que
expire sesiones automáticamente. Rechazar exige un motivo no vacío.

`games_played` aumenta solo al pasar de `submitted` a `validated`, una vez y en
la misma transacción. Incluye ambos modos si se validan. Una actualización sin
cambio de una sesión validada no vuelve a contarla. Las sesiones bloquean
`DELETE` y `TRUNCATE`; el progreso bloquea `TRUNCATE`.

Estos controles validan estructura y transiciones. Todavía no prueban que un
score sea legítimo, que una partida haya ocurrido o que merezca una recompensa.
Esa verificación pertenece al futuro servidor, antes de validar y premiar.

## Seguridad y permisos

RLS se activa en las cinco tablas. El navegador solo recibe estos permisos:

| Rol | `games` | Progreso, sesiones y ambos ledgers |
| --- | --- | --- |
| `anon` | `SELECT` de catálogo | Sin lectura ni escritura |
| `authenticated` | `SELECT` de catálogo | `SELECT` solo cuando `auth.uid() = user_id` |

No se conceden `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` ni `TRIGGER`
a ninguno de esos roles sobre Core. Se revocan los permisos de tabla **y de
columna** de `PUBLIC`, `anon` y `authenticated`. La comprobación final verifica
también los permisos efectivos heredados; un grant indirecto incompatible aborta
la transacción en vez de dejar una instalación parcialmente segura.

Cada tabla privada tiene `theretos_core_select` permisiva y
`theretos_core_select_guard` restrictiva. La guarda evita que otra policy
permisiva amplíe la lectura a otros usuarios. El catálogo tiene
`theretos_core_select`. No hay policies de escritura para el navegador. RLS no
se fuerza sobre el propietario: las comprobaciones de aislamiento deben usar
usuarios autenticados reales, no solo el rol propietario del SQL Editor.
Referencia: [RLS en Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

Las funciones viven en el esquema privado `theretos_core`, con
`search_path = ''` explícito y referencias de tablas calificadas. No se concede
`USAGE`, `CREATE` ni `EXECUTE` de ese esquema/funciones al navegador o a `PUBLIC`.
No se crean RPC públicas, rutas de API ni Server Actions que otorguen valor.

| Función `theretos_core.*` | Seguridad | Uso |
| --- | --- | --- |
| `set_updated_at()` | INVOKER | Marca actualizaciones de catálogo, progreso y sesiones. |
| `create_player_progress()` | DEFINER | Crea progreso a partir de `NEW.id` del perfil recién insertado. |
| `reject_mutation()` | INVOKER | Bloquea cambios o borrados de historial y truncados. |
| `guard_game_session()` | INVOKER | Controla creación, identidad, estados y fechas de sesión. |
| `count_validated_game()` | INVOKER | Incrementa partidas al validar. |
| `apply_ledger_entry()` | INVOKER | Valida sesión vinculada y consolida XP o tickets. |

La única elevación de privilegios es `create_player_progress()`: el flujo de
registro existente no necesita permisos nuevos sobre el progreso. Recibe su
usuario del trigger, sin aceptar parámetros del navegador. Las seis funciones
devuelven `trigger`; el resto conserva los permisos del escritor autorizado.
Referencia: [seguridad de funciones en Supabase](https://supabase.com/docs/guides/database/functions).

| Trigger | Tabla(s) | Momento |
| --- | --- | --- |
| `theretos_core_profile_created` | `profiles` | AFTER INSERT |
| `theretos_core_updated_at` | `games`, `player_progress`, `game_sessions` | BEFORE UPDATE |
| `theretos_core_ledger_apply` | Ambos ledgers | AFTER INSERT |
| `theretos_core_immutable` | Ambos ledgers | BEFORE UPDATE OR DELETE |
| `theretos_core_no_truncate` | Progreso, sesiones y ambos ledgers | BEFORE TRUNCATE, por sentencia |
| `theretos_core_session_guard` | `game_sessions` | BEFORE INSERT OR UPDATE |
| `theretos_core_session_count` | `game_sessions` | AFTER UPDATE, al entrar en `validated` |
| `theretos_core_session_no_delete` | `game_sessions` | BEFORE DELETE |

El script no sustituye triggers de `auth.users`, no reescribe el registro y no
cambia permisos/policies de `profiles`. Añade únicamente su trigger a `profiles`.

## Aplicación manual en theretos-2-dev

Estos pasos son para el **8 de octubre de 2026**, o cuando se decida aplicar la
revisión. No se ha ejecutado ningún paso contra Supabase durante este trabajo.

1. Usar la rama `theretos-2.0` y el commit de esta revisión. Abrir el dashboard
   de Supabase y seleccionar explícitamente **`theretos-2-dev`**. Confirmar el
   nombre del proyecto antes de abrir **SQL Editor**. Ejecutar como propietario
   de `profiles`; no colocar credenciales administrativas en la app ni modificar
   `.env.local`.
2. Ejecutar completo [inspect-profiles.sql](inspect-profiles.sql) y después
   [inspect-theretos-core.sql](inspect-theretos-core.sql). Ambos son de lectura.
   Guardar/exportar los resultados previos para poder comparar UUID, nombres y
   `created_at`. Confirmar `profiles.id UUID NOT NULL` con PK/UNIQUE no diferible
   y revisar sus triggers de registro existentes.
3. En los resultados de Core, confirmar las seis columnas legadas de `games`,
   los cinco slugs y UUID de la tabla anterior, ausencia de duplicados y estado
   `active`. Confirmar que `game_sessions` conserva la FK UUID hacia `games(id)`
   y que su `row_count` es **0**. Revisar las restricciones y policies legadas
   descritas arriba. `player_progress`, `xp_ledger`, `tickets_ledger` y el esquema
   privado Core deben estar ausentes en esta primera adopción. Si aparece una
   estructura distinta o una fila de sesión, detenerse y conservar los resultados;
   no borrar datos ni eliminar comprobaciones para forzar la migración.
4. Abrir [202610070001_theretos_core_v1.sql](migrations/202610070001_theretos_core_v1.sql),
   copiar **todo el archivo**, desde `BEGIN` hasta `COMMIT`, y ejecutarlo una vez
   en el SQL Editor de **`theretos-2-dev`**. No ejecutar fragmentos. La migración
   bloquea las tablas necesarias, vuelve a comprobar sesiones vacías y coordina
   el backfill con los registros de perfiles. `lock_timeout = '5s'` limita la
   espera; si vence, reintentar completo en una ventana tranquila.
5. Si aparece cualquier error, ejecutar `ROLLBACK;` si el editor mantiene la
   transacción abierta. Guardar el error y volver a inspeccionar: todo cambio
   debe haberse revertido. No continuar con bloques posteriores ni hacer una
   reconstrucción manual.
6. Volver a ejecutar completo `inspect-theretos-core.sql`. Comparar los cinco
   UUID, slugs, nombres y `created_at` con la exportación previa: deben ser
   idénticos. Confirmar los cinco estados `available`, los dos juegos futuros
   `coming-soon`, PK UUID, `UNIQUE(slug)`, FK `game_sessions.game_id → games.id`
   y sesiones todavía vacías. Comprobar todos los permisos, restricciones y
   agregados de la siguiente sección. La inspección termina en `ROLLBACK` por
   ser de solo lectura; ese resultado es normal.
7. En este entorno de desarrollo, repetir el archivo completo y la inspección
   para verificar idempotencia: deben conservarse UUID, nombres, fechas, estados,
   saldos y movimientos. Completar las pruebas con cuentas A y B. Verificar
   especialmente que `Users can start own game sessions` ya no existe y que el
   navegador no puede insertar sesiones ni escribir XP/tickets. No habilitar
   escrituras de producción hasta implementar la capa de servidor.

La migración es transaccional y repetible sobre su propio esquema. La huella de
cada tabla (`theretos-core-v1-uuid:<md5>`) registra columnas, tipos, nulabilidad,
defaults, restricciones y su validación, índices, definición de triggers y su
estado habilitado/deshabilitado. Antes de una repetición se compara la estructura
actual con esa huella; eliminar una restricción, alterar una columna o desactivar
un trigger aborta la aplicación. La huella se guarda únicamente tras las
comprobaciones finales de seguridad.

Esto detecta deriva accidental, no protege frente a un administrador capaz de
alterar también la huella. Una actualización mayor de PostgreSQL puede cambiar
la representación de las restricciones y requerir revisión. No modificar los
marcadores para forzar la ejecución. Solo tras validar la huella intacta se
reinstalan funciones, triggers y policies Core; los datos existentes se conservan.

## Verificación tras aplicar

En la inspección deben aparecer:

- Las cinco tablas con `relrowsecurity = true`, las FK y CHECK descritas, y
  las restricciones únicas de `game_session_id` de ambos ledgers.
- `games_id_uuid_not_null`, `games_id_primary_key`, `games_slug_unique`,
  `game_sessions_game_id_uuid_not_null` y
  `game_sessions_game_id_references_games_id` en `true`; sin slugs duplicados.
  Las tres policies legadas de catálogo/sesiones deben haber desaparecido.
- Los siete juegos con los estados iniciales en la primera instalación. Los
  cinco juegos legados conservan UUID, slug, nombre y `created_at`;
  `game_sessions.row_count = 0` tras su primera modernización. En una repetición
  se conservan sesiones y cambios administrativos previos del catálogo.
- Igual número de `profiles` y `player_progress`; `profiles_without_progress = 0`.
- `xp_mismatches`, `ticket_mismatches` y `session_mismatches` en cero en el XML
  de reconciliación. La inspección informa diferencias, no las corrige.
- `anon.can_select = true` solo para `games`; `authenticated.can_select = true`
  para las cinco tablas. Todos los permisos de escritura efectivos, incluidos
  los de columna, deben ser `false`. Las policies determinan qué filas se leen.
- `can_use_schema`, `can_create_in_schema` y `can_execute = false` para ambos
  roles sobre `theretos_core`. Solo `create_player_progress()` tiene
  `security_definer = true`; todas las funciones tienen `search_path` vacío.
- Los triggers de Auth existentes, sin sustituciones, y el nuevo trigger de
  progreso en `profiles`.

Los bloques de conteo y seed usan SELECT condicionales mediante `query_to_xml`
para poder ejecutarse aunque Core todavía no exista. La transacción de lectura
impide escrituras. Ejecutar con el propietario para que los totales no queden
filtrados por RLS. Los conteos no imprimen datos personales.

### Cuentas de prueba

Usar un proyecto de prueba y dos cuentas distintas A y B creadas mediante el
registro normal. El SQL Editor con propietario omite RLS y por sí solo no prueba
el acceso del navegador. Desde un cliente Supabase con la sesión real de A,
verificar estas lecturas con el UUID de B:

```ts
for (const table of ["player_progress", "game_sessions", "xp_ledger", "tickets_ledger"]) {
  const result = await supabase.from(table).select("*").eq("user_id", idDeB);
  // Debe devolver [] sin revelar filas de B.
  console.log(table, result.error, result.data);
}
```

No guardar tokens ni identificadores reales en el repositorio. Verificar además:

1. A ve su progreso inicial y B ve el suyo; A no ve el progreso de B. Para
   sesiones/ledgers, usar fixtures del proyecto de prueba, ya que una tabla
   vacía no demuestra el aislamiento de filas existentes.
2. A intenta cambiar su `xp_total`, `tickets_balance`, `level` y `games_played`:
   debe fallar por permisos. También deben fallar INSERT, UPDATE y DELETE sobre
   sesiones y ledgers, y escrituras sobre `games`. Confirmar que ningún dato
   cambió; no basta con leer el error del cliente.
3. Un cliente sin sesión lee `games` y no puede leer las cuatro tablas privadas
   ni escribir en ninguna tabla Core.
4. Un nuevo registro sigue creando su perfil mediante el flujo actual, y el
   trigger Core crea progreso en cero, nivel 1. Login, edición de perfil y
   recuperación de contraseña deben conservar su comportamiento.
5. Repetir la inspección: ningún permiso de escritura/ejecución nuevo y ninguna
   diferencia de agregados.

### Validación local

Desde `theretos/`, con dependencias instaladas:

```sh
npm.cmd test
npm.cmd run lint
npm.cmd run build
git diff --check
```

Los tests de Node existentes siguen formando parte de `npm test`. Los de Core
ejecutan la migración con PostgreSQL 18.3 embebido (PGlite 0.5.8) sobre fixtures aislados y
comprueban la adopción del legado real, conservación de UUID, aborto transaccional
si hay sesiones, eliminación de escritura del navegador y los invariantes
contables y de sesiones. No contactan Supabase ni prueban
su configuración real de Auth, PostgREST, roles, extensiones o políticas previas.
Tampoco sustituyen una prueba con conexiones concurrentes independientes. Las
verificaciones manuales anteriores siguen pendientes hasta ejecutarlas contra
el proyecto elegido.

## Alcance pendiente y decisiones operativas

No están implementados `startGame`, `submitGame`, `validateGame`, `awardXP` ni
`awardTickets`. Tampoco hay antitrampas, límites por juego, reglas de premios,
escritor de servidor habilitado, cálculo de nivel, rankings, torneos, marketplace
o canjes. No se conecta ninguno de los cinco juegos y no se elimina el código
demo. La migración no expone ninguna vía que confíe en XP, tickets o score
enviados por el navegador.

`ON DELETE RESTRICT` preserva la auditoría y puede bloquear la eliminación de
una cuenta/perfil que tenga progreso, incluso con saldo cero. Antes de ofrecer
borrado de cuentas debe diseñarse una política explícita de retención y
anonimización; no resolverlo borrando ledgers o añadiendo cascadas. No hay una
migración de reversión destructiva: ante problemas, conservar los datos y
preparar una migración correctiva.

Si la FK existente de `profiles` a `auth.users` tiene borrado en cascada, eliminar
el usuario de Auth también puede fallar al intentar borrar su perfil protegido
por Core. Esta consecuencia debe verificarse en el proyecto de prueba antes de
cualquier operación administrativa de borrado de cuentas.

Las siguientes fases deben construir, en orden, la capa de servidor con identidad
derivada de la sesión autenticada y permisos mínimos; el inicio y envío de
sesiones con validación por juego y prevención de reintentos; la validación y
recompensas atómicas e idempotentes; la lectura real de progreso e historial en
la UI; y después rankings, torneos y canjes. El servidor debe decidir importes,
usuario y claves de evento, sin aceptar esos valores como autoridad del cliente.
