"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Intent = "none" | "confirm" | "error";
type Notice = { kind: "none" | "checking" | "error" } | { kind: "confirmed"; email: string };

export function LoginConfirmationNotice({ intent }: { intent: Intent }) {
  const [notice, setNotice] = useState<Notice>({ kind: intent === "confirm" ? "checking" : intent === "error" ? "error" : "none" });
  const feedback = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    let revision = 0;
    async function verify() {
      const currentRevision = ++revision;
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      if (intent === "error" || ["error", "error_code", "error_description"].some((key) => fragment.has(key))) {
        setNotice({ kind: "error" });
        return;
      }
      if (intent !== "confirm") { setNotice({ kind: "none" }); return; }
      setNotice({ kind: "checking" });
      try {
        // The URL is only a hint. Confirm the account with Supabase before
        // displaying success; adding ?confirmed=1 alone proves nothing.
        const { data, error } = await createClient().auth.getUser();
        if (!active || revision !== currentRevision) return;
        setNotice(!error && data.user?.email_confirmed_at && data.user.email
          ? { kind: "confirmed", email: data.user.email }
          : { kind: "error" });
      } catch {
        if (active && revision === currentRevision) setNotice({ kind: "error" });
      }
    }
    const onHashChange = () => { void verify(); };
    window.addEventListener("hashchange", onHashChange);
    void verify();
    return () => {
      active = false;
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [intent]);

  useEffect(() => {
    if (notice.kind === "confirmed" || notice.kind === "error") {
      feedback.current?.focus({ preventScroll: true });
      feedback.current?.scrollIntoView({ block: "center", behavior: "auto" });
    }
  }, [notice.kind]);

  if (notice.kind === "none") return null;
  if (notice.kind === "checking") return <p role="status">Comprobando la confirmación de tu correo...</p>;
  return (
    <section ref={feedback} className={`account-notice ${notice.kind === "error" ? "account-notice-error" : "account-notice-success"}`} role={notice.kind === "error" ? "alert" : "status"} tabIndex={-1}>
      {notice.kind === "confirmed" ? <>
        <h3>Correo confirmado</h3>
        <p>El correo {notice.email} está confirmado. Puedes continuar a tu cuenta.</p>
        <Link href="/profile">Ir a mi perfil</Link>
      </> : <>
        <h3>No pudimos validar el enlace</h3>
        <p>Puede haber vencido, haberse usado o haberse abierto en otro navegador. Si tu correo ya está confirmado, inicia sesión. También puedes solicitar un enlace nuevo.</p>
        <Link href="/resend-confirmation">Reenviar correo de confirmación</Link>
      </>}
    </section>
  );
}
