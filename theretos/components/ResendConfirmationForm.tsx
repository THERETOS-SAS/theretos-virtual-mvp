"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resendSignupConfirmation, SignupError } from "@/lib/supabase/signup";
import { AccountFormField } from "./AccountFormField";
import { IconCheckCircle } from "./icons";

export function ResendConfirmationForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
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
    const email = String(new FormData(form).get("confirmation-email") ?? "");
    sending.current = true;
    setLoading(true);
    setMessage("");
    try {
      await resendSignupConfirmation(createClient(), email, window.location.origin);
      form.reset();
      setSent(true);
    } catch (error) {
      setMessage(error instanceof SignupError ? error.message : "No pudimos solicitar el correo. Revisa tu conexión e inténtalo nuevamente.");
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
      <p>Si existe un registro pendiente para esa dirección, recibirás un enlace de confirmación. Revisa también spam.</p>
      <p>Abre el enlace más reciente en este mismo navegador y dispositivo.</p>
      <Link href="/login">Volver a iniciar sesión</Link>
    </section>
  );

  return (
    <form className="account-form" onSubmit={handleSubmit} aria-busy={loading}>
      {message && <p className="recovery-error" role="alert">{message}</p>}
      <AccountFormField id="confirmation-email" name="confirmation-email" label="Correo de tu registro" type="email" autoComplete="email" required disabled={loading} />
      <p className="recovery-hint">Abre el enlace en el mismo navegador y dispositivo donde lo solicites.</p>
      <button className="account-submit" type="submit" disabled={loading}>{loading ? "Solicitando correo..." : "Reenviar confirmación"}</button>
    </form>
  );
}
