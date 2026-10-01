"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AccountFormField } from "./AccountFormField";
import { createClient } from "@/lib/supabase/client";
import { safeInternalPath } from "@/lib/auth-redirect";

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const submitting = useRef(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setMessage("");
    setNeedsConfirmation(false);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("login-email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(form.get("login-password") ?? "");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.code === "email_not_confirmed") {
          setNeedsConfirmation(true);
          setMessage("Debes confirmar tu correo antes de iniciar sesión.");
        } else if (error.status === 429) {
          setMessage("Hay demasiados intentos. Espera unos minutos antes de volver a iniciar sesión.");
        } else {
          setMessage("No pudimos iniciar sesión. Revisa tu correo, contraseña y conexión.");
        }
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const returnUrl = safeInternalPath(
        params.get("returnTo") ?? params.get("returnUrl")
      );

      window.location.assign(returnUrl);
    } catch {
      setMessage(
        "No pudimos iniciar sesión. Verifica tu conexión e inténtalo nuevamente."
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <form className="account-form" onSubmit={handleSubmit} aria-busy={loading}>
      <AccountFormField
        id="login-email"
        name="login-email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        required
        disabled={loading}
      />

      <AccountFormField
        id="login-password"
        name="login-password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        required
        disabled={loading}
      />

      {message && (
        <p className="recovery-error" role="alert">
          {message}
        </p>
      )}
      {needsConfirmation && <Link className="account-text-link" href="/resend-confirmation">Reenviar correo de confirmación</Link>}

      <button type="submit" className="account-submit" disabled={loading}>
        {loading ? "Ingresando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
