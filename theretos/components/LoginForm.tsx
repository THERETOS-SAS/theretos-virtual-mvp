"use client";

import { useState } from "react";
import { AccountFormField } from "./AccountFormField";
import { createClient } from "@/lib/supabase/client";

function safeReturnUrl(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/profile";
}

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
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
        console.error(error);
        setMessage("Correo o contraseña incorrectos.");
        return;
      }

      // Puente temporal mientras terminamos de migrar AuthProvider a Supabase.
      localStorage.setItem("theretos_demo_session", "active");

      const params = new URLSearchParams(window.location.search);
      const returnUrl = safeReturnUrl(
        params.get("returnTo") ?? params.get("returnUrl")
      );

      window.location.assign(returnUrl);
    } catch (error) {
      console.error(error);
      setMessage(
        "No pudimos iniciar sesión. Verifica tu conexión e inténtalo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="account-form" onSubmit={handleSubmit}>
      <AccountFormField
        id="login-email"
        name="login-email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        required
      />

      <AccountFormField
        id="login-password"
        name="login-password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        required
      />

      {message && (
        <p role="alert" style={{ marginTop: "1rem" }}>
          {message}
        </p>
      )}

      <button type="submit" className="account-submit" disabled={loading}>
        {loading ? "Ingresando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}