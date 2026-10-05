# Cierre de sesión con confirmación visible

El botón de salida del perfil espera el resultado de Supabase y muestra
«Cerrando sesión…» mientras la solicitud está pendiente. Todos los botones
comparten ese estado para impedir solicitudes duplicadas.

AuthProvider controla la navegación de las páginas de cuenta. Cuando la salida
termina correctamente, lleva al login y muestra «Sesión cerrada». El mensaje
vive en memoria dentro del contexto: no depende de un parámetro de la URL ni
se conserva después de recargar la página. Un nuevo inicio de sesión lo borra.

Si la solicitud falla y la sesión sigue abierta, el perfil conserva sus datos
y muestra un error con posibilidad de reintentar. No navega al inicio para
simular una salida correcta.

La versión instalada de Supabase también puede emitir `SIGNED_OUT`, borrar la
sesión local y después devolver un error de revocación. En ese caso se respetan
los datos de sesión del SDK y se muestra en el login un aviso de cierre parcial,
sin afirmar que el cierre remoto haya sido confirmado.

Se conserva el alcance predeterminado de `auth.signOut()` que ya utilizaba el
proyecto. No se cambian RLS, variables de entorno ni dependencias. Tickets, XP,
torneos e historial demo conservan su lógica y almacenamiento.

Las respuestas de perfil pendientes se invalidan al salir. Si durante una
solicitud aparece una cuenta distinta en el contexto, una respuesta tardía no
borra manualmente esa cuenta ni presenta el éxito de la solicitud anterior.
Esto no coordina todos los posibles inicios y cierres simultáneos dentro del SDK.

## Validación

Desde la carpeta de la app:

```bash
npm run lint &&
node --test tests/profile.test.mjs tests/password.test.mjs tests/auth-redirect.test.mjs tests/codespaces-origin.test.mjs tests/signup.test.mjs &&
npm run build
```

La comprobación local adicional de React DOM cubre espera y doble clic,
errores devueltos y excepciones, error después de `SIGNED_OUT`, cambio de
cuenta, respuestas de perfil tardías y navegación de las páginas protegidas.
Usa respuestas simuladas y no cierra sesiones reales.

## Prueba en Codespaces

1. Iniciar la app en el puerto 3000 y entrar con una cuenta propia de prueba.
2. En **Mi perfil → Seguridad y cuenta**, pulsar **Cerrar sesión**. El botón
   debe quedar bloqueado durante la solicitud.
3. Al terminar, comprobar la página de login con **Sesión cerrada**, el encabezado
   **Ingresar** y la ausencia de los datos personales del perfil anterior.
4. Volver a abrir `/profile`: debe dirigir al login. La página de inicio debe
   seguir siendo accesible sin iniciar sesión.
5. Iniciar sesión otra vez y comprobar que desaparece el aviso de salida,
   carga el perfil correcto y se pueden guardar sus datos.
6. Para comprobar un fallo de red, desconectar temporalmente la red del navegador
   antes de salir. Si la sesión se conserva, debe aparecer error y permitir
   reintentar. Si Supabase borra la sesión local, debe aparecer el aviso de
   cierre parcial en el login. Ningún fallo debe mostrar «Sesión cerrada» como
   confirmación completa. Restaurar la conexión antes de continuar.

Esta comprobación no necesita cambios en el panel de Supabase.
