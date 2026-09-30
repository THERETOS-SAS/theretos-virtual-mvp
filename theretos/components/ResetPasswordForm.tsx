"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { saveNewPassword } from "@/app/reset-password/actions";
import { createClient } from "@/lib/supabase/client";
import { getPasswordValidationError } from "@/lib/supabase/password";
import { AccountFormField } from "./AccountFormField";
import { IconCheckCircle } from "./icons";

type SessionState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "ready"; userId: string; email: string };

export function ResetPasswordForm({ invalidLink = false }: { invalidLink?: boolean }) {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const saving = useRef(false);
  const verifiedUserId = useRef<string | null>(null);
  const feedback = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    let verifiedId: string | null = null;
    let observedId: string | null | undefined;
    let unsubscribe: (() => void) | undefined;

    async function checkSession() {
      // Supabase may send errors in the fragment, which the server cannot read.
      const hash = new URLSearchParams(window.location.hash.slice(1));
      if (invalidLink || ["error", "error_code", "error_description"].some((key) => hash.has(key))) {
        setSession({ status: "invalid" });
        return;
      }
      try {
        const supabase = createClient();
        const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => {
          observedId = current?.user.id ?? null;
          if (active && verifiedId && observedId !== verifiedId) {
            verifiedUserId.current = null;
            setSaved(false);
            setSession({ status: "invalid" });
          }
        });
        unsubscribe = () => listener.subscription.unsubscribe();
        const { data, error } = await supabase.auth.getUser();
        if (!active) return;
        if (error || !data.user || (observedId !== undefined && observedId !== data.user.id)) {
          setSession({ status: "invalid" });
          return;
        }
        verifiedId = data.user.id;
        verifiedUserId.current = verifiedId;
        setSession({ status: "ready", userId: data.user.id, email: data.user.email ?? "" });
      } catch {
        if (active) setSession({ status: "invalid" });
      }
    }
    void checkSession();
    return () => { active = false; verifiedUserId.current = null; unsubscribe?.(); };
  }, [invalidLink]);

  useEffect(() => {
    if (saved) {
      feedback.current?.focus({ preventScroll: true });
      feedback.current?.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }, [saved]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (session.status !== "ready" || verifiedUserId.current !== session.userId || saving.current) return;
    const expectedUserId = session.userId;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get("new-password") ?? "");
    const confirmation = String(fields.get("confirm-password") ?? "");
    const validationError = getPasswordValidationError(password, confirmation);
    if (validationError) { setMessage(validationError); return; }
    saving.current = true;
    setLoading(true);
    setMessage("");
    try {
      const result = await saveNewPassword(expectedUserId, password, confirmation);
      if (verifiedUserId.current !== expectedUserId) return;
      if (!result.ok) {
        setMessage(result.message);
        if (result.sessionExpired) setSession({ status: "invalid" });
        return;
      }
      form.reset();
      setSaved(true);
    } catch {
      setMessage("No pudimos confirmar el cambio. Revisa tu conexión antes de intentarlo nuevamente.");
    } finally {
      saving.current = false;
      setLoading(false);
    }
  }

  if (saved) return (
    <section ref={feedback} className="account-success recovery-success" role="status" tabIndex={-1}>
      <IconCheckCircle />
      <span>CONTRASEÑA ACTUALIZADA</span>
      <h2>Tu contraseña se guardó</h2>
      <p>Úsala la próxima vez que inicies sesión. Ahora puedes continuar a tu cuenta.</p>
      <Link href="/profile">Ir a mi perfil</Link>
    </section>
  );

  if (session.status === "loading") return <p role="status">Comprobando tu enlace...</p>;
  if (session.status === "invalid") return (
    <div className="account-form">
      <p className="recovery-error" role="alert">No pudimos validar el acceso o la cuenta cambió. Solicita un enlace nuevo y ábrelo en el mismo navegador donde lo pediste.</p>
      <Link className="account-back-link" href="/forgot-password">Solicitar otro enlace</Link>
    </div>
  );

  return (
    <form className="account-form" onSubmit={handleSubmit} aria-busy={loading}>
      <p className="recovery-hint">Cuenta: {session.email || "tu cuenta THERETOS"}</p>
      {message && <p className="recovery-error" role="alert">{message}</p>}
      <AccountFormField id="new-password" name="new-password" label="Nueva contraseña" type="password" autoComplete="new-password" hint="Mínimo 8 caracteres" minLength={8} required disabled={loading} />
      <AccountFormField id="confirm-password" name="confirm-password" label="Repite la nueva contraseña" type="password" autoComplete="new-password" minLength={8} required disabled={loading} />
      <button type="submit" className="account-submit" disabled={loading}>
        {loading ? "Guardando contraseña..." : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}
