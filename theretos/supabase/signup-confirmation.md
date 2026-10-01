# Confirmación del registro

El registro envía los datos de la cuenta a Supabase Auth y solicita un enlace
para confirmar el correo. El reenvío usa `auth.resend({ type: "signup" })`.
Ambos pasan por el callback PKCE existente y regresan a `/login?confirmed=1`.

La pantalla de login consulta `auth.getUser()` antes de mostrar «Correo
confirmado». El parámetro de la URL no basta: debe existir una cuenta autenticada
con correo confirmado. Los errores del enlace, tanto en la consulta como en el
fragmento de la URL, tienen prioridad. No se muestran mensajes internos de Auth.

Si Supabase devuelve una sesión al registrarse, se ofrece continuar al perfil.
Si no devuelve sesión, el aviso de revisar el correo es neutral; no confirma
que una dirección exista ni que el mensaje haya sido entregado. El reenvío usa
el mismo criterio y muestra un aviso de espera si Supabase limita solicitudes.

## Configuración

En **Authentication → URL Configuration → Redirect URLs**, conservar las URLs
existentes y autorizar la siguiente para el Codespace actual:

```text
https://glorious-barnacle-pjqjgx55755p27p5x-3000.app.github.dev/auth/callback?next=%2Flogin%3Fconfirmed%3D1
```

La captura de configuración del proyecto ya muestra esta URL añadida. Si cambia
el Codespace, autorizar el nuevo dominio exacto. Para desarrollo local, el
registro necesita la misma ruta bajo `http://localhost:3000`; la entrada local
`http://localhost:3000/**` existente la incluye.

En **Authentication → Email Templates → Confirm signup**, conservar el enlace
`{{ .ConfirmationURL }}` de la plantilla predeterminada. No reemplazarlo por una
URL directa al login: el enlace necesita validar el token y ejecutar el callback.

Para probar la confirmación por correo, **Confirm email** debe estar habilitado
en el proveedor Email. El código contempla también la sesión inmediata cuando
esa configuración está desactivada; no cambia la configuración de Supabase.

Abrir siempre el enlace más reciente en el mismo navegador, perfil, dispositivo
y dominio donde se solicitó. El flujo PKCE necesita las cookies de esa solicitud.
Evitar solicitar varios enlaces a la vez o mezclar recuperación de contraseña
y confirmación pendientes. Ante un fallo, esperar y solicitar un nuevo enlace.

El servicio de correo debe permitir enviar al destinatario de prueba. Revisar
los logs de Auth si no llega. El servicio predeterminado de Supabase tiene
restricciones de destinatarios y límites de envío; para usuarios externos,
configurar SMTP propio. El código no puede comprobar la entrega del mensaje.

No hay SQL, dependencias ni variables nuevas. Se conservan `.env.local`, las
políticas de `public.profiles` y la lógica de tickets/XP; estos últimos siguen
identificados como demostración.

## Validación técnica

Desde la carpeta de la app, con Node 24:

```bash
npm run lint &&
node --test tests/profile.test.mjs tests/password.test.mjs tests/auth-redirect.test.mjs tests/codespaces-origin.test.mjs tests/signup.test.mjs &&
npm run build
```

Las pruebas de registro cubren los datos enviados, contraseña sin recortes,
sesión devuelta, respuestas neutrales, validación, fallos y límites de envío.
También ejecutan el cliente real de Supabase con transporte simulado para
comprobar el desafío PKCE y la cookie del verificador en registro y reenvío.
No envían correos ni crean cuentas reales.

## Prueba real en Codespaces

1. Con la app activa en el puerto 3000, cerrar sesión y abrir `/signup`.
   Registrar una cuenta propia de prueba con un correo permitido por el servicio.
   Comprobar que los datos quedan bloqueados durante la solicitud y que aparece
   el aviso «Revisa tu correo electrónico» al finalizar sin sesión.
2. Abrir el correo más reciente en el mismo navegador. Debe regresar al login,
   mostrar primero la comprobación y después «Correo confirmado», con un enlace
   al perfil. Revisar el perfil, cerrar sesión e iniciar con la cuenta nueva.
3. Para probar el reenvío, usar un registro propio todavía sin confirmar.
   Abrir `/resend-confirmation`, solicitar una vez el enlace y usar el correo
   más reciente. Debe completar la misma confirmación. Respetar el aviso de
   espera si se alcanza el límite de envío.
4. Un correo sin confirmar que intente iniciar sesión debe recibir un aviso
   y un enlace para reenviar la confirmación. Una contraseña incorrecta debe
   producir un error sin revelar detalles internos.
5. Reutilizar un enlace o abrir uno vencido debe mostrar un aviso que permita
   solicitar otro. Abrir `/login?confirmed=1` sin sesión no debe mostrar éxito.
6. Comprobar que editar perfil, guardar datos, logout y recuperación de contraseña
   siguen funcionando. No modificar tickets, XP ni recompensas reales.

Referencias: [Registro](https://supabase.com/docs/reference/javascript/auth-signup),
[Reenvío](https://supabase.com/docs/reference/javascript/auth-resend),
[PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
[SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
