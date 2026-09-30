"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PasswordRecoveryError, requestPasswordRecovery } from "@/lib/supabase/password";
import { AccountFormField } from "./AccountFormField";
import { IconCheckCircle } from "./icons";

export function ForgotPasswordForm({ invalidLink = false }: { invalidLink?: boolean }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(invalidLink
    ? "El enlace no es válido, ya se usó o venció. Solicita uno nuevo y ábrelo en este mismo navegador."
    : "");
  const sending = useRef(false);
  const feedback = useRef<HTMLElement>(null);

  useEffect(() => {
    if (sent) {
      feedback.current?.focus({ preventScroll: true });
      feedback.current?.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }, [sent]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const form = event.currentTarget;
    const email = String(new FormData(form).get("recovery-email") ?? "");
    sending.current = true;
    setLoading(true);
    setMessage("");
    try {
      await requestPasswordRecovery(createClient(), email, window.location.origin);
      form.reset();
      setSent(true);
    } catch (error) {
      setMessage(error instanceof PasswordRecoveryError
        ? error.message
        : "No pudimos solicitar el enlace. Revisa tu conexión e inténtalo nuevamente.");
    } finally {
      sending.current = false;
      setLoading(false);
    }
  }

  if (sent) return (
    <section ref={feedback} className="account-success recovery-success" role="status" tabIndex={-1}>
      <IconCheckCircle />
      <span>SOLICITUD RECIBIDA</span>
      <h2>Revisa tu correo</h2>
      <p>Si existe una cuenta asociada a esa dirección, recibirás un enlace para elegir una contraseña nueva. Revisa también la carpeta de spam.</p>
      <p>Abre el enlace más reciente en este mismo navegador y dispositivo.</p>
    </section>
  );

  return (
    <form className="account-form" onSubmit={handleSubmit} aria-busy={loading}>
      {message && <p className="recovery-error" role="alert">{message}</p>}
      <AccountFormField id="recovery-email" name="recovery-email" label="Correo electrónico" type="email" autoComplete="email" required disabled={loading} />
      <p className="recovery-hint">Solicita y abre el enlace en el mismo navegador y dispositivo.</p>
      <button type="submit" className="account-submit" disabled={loading}>
        {loading ? "Enviando instrucciones..." : "Enviar instrucciones"}
      </button>
    </form>
  );
}
