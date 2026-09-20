"use client";

import { useState } from "react";
import { AccountFormField } from "./AccountFormField";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    const form = new FormData(event.currentTarget);

    const firstName = String(form.get("signup-name") ?? "").trim();
    const lastName = String(form.get("signup-last-name") ?? "").trim();
    const email = String(form.get("signup-email") ?? "").trim();
    const phone = String(form.get("signup-phone") ?? "").trim();
    const password = String(form.get("signup-password") ?? "");
    const confirmation = String(form.get("signup-confirm") ?? "");

    if (password !== confirmation) {
      setMessage("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setMessage("La contraseña debe tener mínimo 8 caracteres.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const next = encodeURIComponent("/login?confirmed=1");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}`,
        data: {
          first_name: firstName,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`.trim(),
          phone,
        },
      },
    });

    if (error) {
      console.error(error);
      setMessage(
        "No pudimos completar el registro. Revisa los datos e inténtalo nuevamente."
      );
      setLoading(false);
      return;
    }

    setCreated(true);
    setLoading(false);
  }

  if (created) {
    return (
      <section className="account-success" aria-live="polite">
        <span>REGISTRO RECIBIDO</span>
        <h2>Revisa tu correo electrónico.</h2>
        <p>
          Te enviamos un mensaje para confirmar tu cuenta THERETOS.
          Después de confirmar podrás iniciar sesión.
        </p>
      </section>
    );
  }

  return (
    <form className="account-form signup-form" onSubmit={handleSubmit}>
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

      {message && (
        <p role="alert" style={{ marginTop: "1rem" }}>
          {message}
        </p>
      )}

      <button type="submit" className="account-submit" disabled={loading}>
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}