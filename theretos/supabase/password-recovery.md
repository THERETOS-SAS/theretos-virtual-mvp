# Recuperación de contraseña

La página `/forgot-password` solicita un correo real mediante Supabase Auth.
El enlace pasa por `/auth/callback`, intercambia el código PKCE y abre
`/reset-password`. El formulario valida la sesión y la acción de servidor vuelve
a comprobar la identidad antes de actualizar la contraseña.

No requiere SQL ni cambios en `public.profiles`. Se usan las dos variables
Supabase que ya tiene `.env.local`; no hay dependencias nuevas.

## Configuración en Supabase

1. En **Authentication → URL Configuration → Redirect URLs**, conservar las
   direcciones de registro existentes y añadir la URL exacta de recuperación.
   Para el Codespace actual:

   ```text
   https://glorious-barnacle-pjqjgx55755p27p5x-3000.app.github.dev/auth/callback?next=%2Freset-password
   ```

   Comprobar primero que el dominio coincide con **Puertos → 3000 → Abrir en
   navegador**. Si cambió el Codespace, sustituir solo ese dominio. Para desarrollo
   local, añadir también, si se usa:

   ```text
   http://localhost:3000/auth/callback?next=%2Freset-password
   ```

2. En **Authentication → Email Templates → Reset Password**, el enlace debe usar
   `{{ .ConfirmationURL }}`. La plantilla predeterminada ya lo hace. No sustituirlo
   por un enlace directo a `/reset-password` ni por `{{ .SiteURL }}`: el código
   tiene que pasar por Supabase y por el callback. Este flujo no usa una plantilla
   personalizada basada en `TokenHash`.
3. El servicio de correo de Supabase debe poder enviar al destinatario de prueba.
   Revisar **Authentication → Logs** si no llega o falla el envío. El servicio
   predeterminado tiene límites bajos y restricciones de destinatarios; para
   usuarios externos se necesita configurar SMTP propio. La interfaz no afirma
   que el correo exista ni que el mensaje se haya entregado.

El flujo PKCE requiere abrir el correo en el mismo navegador, perfil y dispositivo
desde el que se solicitó. Otra pestaña sirve; otro navegador o incógnito no comparte
las cookies. Mantener también el mismo dominio y usar el enlace más reciente.
No es necesario cambiar el Site URL si el redirect de recuperación está autorizado.

## Validación técnica

Desde `/workspaces/theretos-virtual-mvp/theretos`, con Node 24:

```bash
npm run lint &&
node --test tests/profile.test.mjs tests/password.test.mjs tests/auth-redirect.test.mjs &&
npm run build
```

Las pruebas simulan respuestas de Supabase, incluidas las cookies de un flujo
PKCE completo, sin enviar correos ni cambiar contraseñas reales. Las pruebas de
perfil se mantienen como regresión.

## Prueba real en Codespaces

1. Mantener la app encendida en el puerto 3000. Si se detuvo después del build:

   ```bash
   cd /workspaces/theretos-virtual-mvp/theretos
   npm run dev -- --hostname 0.0.0.0 --port 3000
   ```

2. Cerrar sesión en la app. En **Iniciar sesión → ¿Olvidaste tu contraseña?**,
   solicitar un enlace para una cuenta propia de prueba. Comprobar el botón
   «Enviando instrucciones...» y después el aviso «Revisa tu correo».
3. Abrir el correo más reciente en ese mismo navegador. Debe llegar a
   `/reset-password`, mostrar la cuenta y permitir elegir y repetir la contraseña.
   Las contraseñas distintas o de menos de ocho caracteres deben impedir guardar.
4. Guardar una contraseña nueva que cumpla también la política del proyecto.
   Comprobar el botón de carga y el aviso visible «Tu contraseña se guardó».
   La sesión permanece abierta. Entrar al perfil, cerrar sesión y comprobar que
   la nueva contraseña inicia sesión y la anterior ya no lo hace.
5. Reutilizar el correo o abrirlo en otro navegador: debe mostrar un aviso con
   opción de solicitar otro enlace, sin confirmar un cambio. Un enlace vencido
   debe tener el mismo resultado. No intentar validar estos casos cambiando la
   contraseña varias veces innecesariamente.
6. Comprobar error de red durante una solicitud y durante el guardado: nunca debe
   aparecer éxito sin respuesta confirmada. Si la conexión se pierde después de
   que Supabase guardó, el estado puede ser incierto; probar el inicio de sesión
   con la contraseña elegida antes de repetir la recuperación.
7. Con dos cuentas propias, cargar el formulario con A y cambiar a B en otra
   pestaña antes de guardar. Debe bloquearse la pantalla. Si el cambio sucede
   justo durante la petición, la acción utiliza la sesión de esa petición y no
   cambia la contraseña de B; tampoco muestra un éxito tardío para B.
8. Confirmar que registro, login, edición del perfil y logout siguen funcionando.

Si aparece HTTP 502, revisar primero que el servidor esté activo y que el puerto
3000 esté reenviado. Si el enlace falla, comprobar dominio, Redirect URLs,
plantilla, navegador y caducidad antes de modificar la configuración de Auth.

Si el guardado devuelve `Invalid Server Actions request` y la terminal muestra
`Origin: localhost:3000` frente al dominio público en `x-forwarded-host`, el túnel
de Codespaces está reescribiendo el origen. `next.config.ts` permite únicamente
`localhost:3000` como origen adicional cuando `CODESPACES=true` (variable que
GitHub define automáticamente). Reiniciar `npm run dev` después de aplicar el
cambio y recargar `/reset-password`; fuera de Codespaces no se activa la excepción.
Las comprobaciones de sesión de Supabase siguen siendo obligatorias.

Validar esta configuración con `node --test tests/codespaces-origin.test.mjs`.

## Alcance

El cambio de contraseña usa una acción de servidor con cliente Supabase nuevo
por petición y UID verificado. La validación de la pantalla no sustituye esa
comprobación. Las redirecciones de registro y login permanecen dentro del sitio.
Un usuario con sesión válida también puede abrir `/reset-password` directamente
para actualizar su propia contraseña; no se implementa reautenticación adicional.

La recuperación no altera tickets, XP, niveles ni historial: siguen siendo demo.
La entrega real del correo y las políticas SMTP del proyecto requieren la prueba
manual anterior; el build no verifica esos servicios.

Referencias: [Contraseñas](https://supabase.com/docs/guides/auth/passwords),
[PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
[URLs de redirección](https://supabase.com/docs/guides/auth/redirect-urls) y
[SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

Configuración del túnel: [Server Actions de Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)
y [variables de Codespaces](https://docs.github.com/en/codespaces/developing-in-a-codespace/default-environment-variables-for-your-codespace).
