"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AccountFormField } from "./AccountFormField";
import { createClient } from "@/lib/supabase/client";
import { signupAccount, SignupError } from "@/lib/supabase/signup";

export function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState<"check-email" | "signed-in" | null>(null);
  const submitting = useRef(false);
  const feedback = useRef<HTMLElement>(null);

  useEffect(() => {
    if (created) {
      feedback.current?.focus({ preventScroll: true });
      feedback.current?.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }, [created]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setMessage("");
    setLoading(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const result = await signupAccount(createClient(), {
        firstName: String(form.get("signup-name") ?? ""),
        lastName: String(form.get("signup-last-name") ?? ""),
        email: String(form.get("signup-email") ?? ""),
        phone: String(form.get("signup-phone") ?? ""),
        password: String(form.get("signup-password") ?? ""),
        confirmation: String(form.get("signup-confirm") ?? ""),
      }, window.location.origin);
      formElement.reset();
      setCreated(result);
    } catch (error) {
      setMessage(error instanceof SignupError ? error.message : "No pudimos completar el registro. Revisa tu conexión e inténtalo nuevamente.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  if (created) {
    return (
      <section ref={feedback} className="account-success recovery-success" role="status" tabIndex={-1}>
        {created === "signed-in" ? <>
          <span>CUENTA LISTA</span>
          <h2>Tu sesión está abierta</h2>
          <p>Puedes continuar a tu perfil y revisar tus datos.</p>
          <Link href="/profile">Ir a mi perfil</Link>
        </> : <>
          <span>REGISTRO RECIBIDO</span>
          <h2>Revisa tu correo electrónico</h2>
          <p>Si el registro puede completarse con esa dirección, recibirás un enlace de confirmación. Si ya tienes cuenta, inicia sesión.</p>
          <p>Revisa también spam y abre el enlace más reciente en este mismo navegador y dispositivo.</p>
          <Link href="/resend-confirmation">Reenviar correo de confirmación</Link>
          <Link href="/login">Iniciar sesión</Link>
        </>}
      </section>
    );
  }

  return (
    <form className="account-form signup-form" onSubmit={handleSubmit} aria-busy={loading}>
      <fieldset className="account-form-fields" disabled={loading} aria-label="Datos del registro">
      <div className="account-form-row">
        <AccountFormField
          id="signup-name"
          name="signup-name"
          label="Nombre"
          autoComplete="given-name"
          required
        />

        <AccountFormField
          id="signup-last-name"
          name="signup-last-name"
          label="Apellido"
          autoComplete="family-name"
          required
        />
      </div>

      <AccountFormField
        id="signup-email"
        name="signup-email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        required
      />

      <AccountFormField
        id="signup-phone"
        name="signup-phone"
        label="Número de celular"
        hint="Opcional"
        type="tel"
        autoComplete="tel"
      />

      <div className="account-form-row">
        <AccountFormField
          id="signup-password"
          name="signup-password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />

        <AccountFormField
          id="signup-confirm"
          name="signup-confirm"
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <label className="account-checkbox">
        <input type="checkbox" required />
        <span>
          He leído y acepto los Términos y la Política de Privacidad.
        </span>
      </label>

      <label className="account-checkbox">
        <input type="checkbox" required />
        <span>
          Confirmo que cumplo con los requisitos de edad aplicables para utilizar
          THERETOS.
        </span>
      </label>

      </fieldset>
      {message && (
        <p className="recovery-error" role="alert">
          {message}
        </p>
      )}

      <button type="submit" className="account-submit" disabled={loading}>
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}
