# Persistencia de «Editar datos»

Estos archivos se aplican manualmente en el proyecto Supabase conectado a la app.
**No se han ejecutado contra la base de datos real.** El repositorio no contenía
un esquema SQL, por lo que el script valida sus supuestos y aborta si no coinciden.

## Aplicar

1. Abrir **SQL Editor** en el proyecto correcto de Supabase. Ejecutar
   `inspect-profiles.sql` y conservar los resultados: columnas, restricciones,
   policies, permisos efectivos y triggers. Confirmar que `profiles.id` identifica
   al usuario de `auth.users`, y revisar las restricciones de longitud/formato.
2. Ejecutar **todo** `profile-edit-rls.sql`. Requiere el propietario de la tabla.
   La transacción activa RLS y limita los UPDATE del navegador a `first_name`,
   `last_name`, `display_name` y `phone`, exclusivamente en la fila cuyo `id`
   coincide con `auth.uid()`. Incluye SELECT para leer el resultado del UPDATE.
3. Volver a ejecutar `inspect-profiles.sql`: `relrowsecurity` debe ser `true`;
   `authenticated.can_update` debe ser `true` solo para las cuatro columnas;
   `anon.can_update` debe ser siempre `false`. Revisar las cuatro policies
   `theretos_profile_edit_*` y completar las pruebas siguientes.

El script se puede repetir. Conserva datos, triggers de registro y policies ajenas.
Sus policies restrictivas impiden que una policy permisiva previa amplíe el acceso
a otras filas. Una policy restrictiva existente puede seguir bloqueando el acceso
propio: revisar su intención si aparece ese caso. La restricción de SELECT también
cerrará cualquier lectura pública previa de esta tabla de datos personales.

Si falla, ejecutar `ROLLBACK;` si el editor mantiene una transacción abierta.
El fallo revierte todos los cambios del script; no eliminar comprobaciones para
forzarlo. Los permisos heredados ambiguos y esquemas no compatibles requieren
revisión con el resultado de `inspect-profiles.sql`. No se cambian INSERT/DELETE,
funciones RPC, vistas ni permisos de roles internos; revisar por separado cualquier
acceso que estas vías ya expongan. No usar una clave `service_role` en el navegador.

## Verificar con dos cuentas de prueba

Usar cuentas A y B diferentes, ambas con un perfil creado por el registro normal.
No probar RLS solo con el usuario `postgres` del SQL Editor: ese rol la omite.

1. Iniciar sesión como A, editar nombres y celular y guardar. Comprobar el mensaje
   de éxito, el encabezado actualizado y los valores tras recargar y volver a
   iniciar sesión. `display_name` debe reflejar el nombre completo guardado.
2. Borrar el celular y guardar; tras recargar debe seguir vacío y mostrarse
   «Sin registrar». Confirmar que el correo permanece de solo lectura.
3. Abrir B en otro navegador y verificar que ve sus propios datos. Desde un cliente
   Supabase autenticado como A, probar un SELECT y un UPDATE filtrados por el UUID
   de B: deben devolver cero filas o error; verificar como B que nada cambió.
4. Con A, intentar actualizar `id`, `email` (si existe) y cualquier columna protegida
   como rol, XP o saldo (si existe). Debe fallar por permisos, incluso en la fila de A.
5. Con un cliente sin sesión y la clave publicable, SELECT no debe revelar perfiles
   y UPDATE debe fallar. No usar claves administrativas para estas pruebas.
6. Repetir el registro con una cuenta de prueba nueva: el trigger existente debe
   continuar creando su perfil. La migración no sustituye ni reescribe ese trigger.

Para probar A→B, estas son las consultas a ejecutar desde un cliente Supabase con
la sesión de **A** (el `supabase` de la app, no el SQL Editor):

```ts
await supabase.from('profiles')
  .select('id,first_name,last_name,display_name,phone').eq('id', idDeB);
await supabase.from('profiles')
  .update({ display_name: 'Prueba de acceso no permitido' }).eq('id', idDeB)
  .select('id,display_name').single();
```

Verificar además red desconectada, perfil ausente y sesión cerrada/cambiada durante
el guardado: no debe aparecer un éxito local ni mostrarse la identidad anterior.
Tickets, XP, nivel e historial siguen siendo datos demo; esta migración no los
conecta a Supabase.

Referencias: [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security),
[permisos por columna](https://supabase.com/docs/guides/database/postgres/column-level-security)
y [policies restrictivas de PostgreSQL](https://www.postgresql.org/docs/current/sql-createpolicy.html).
