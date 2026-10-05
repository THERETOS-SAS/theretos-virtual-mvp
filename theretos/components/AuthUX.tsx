"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { isProtectedAccountPath, useAuth } from "./AuthProvider";
import { IconArrow, IconUser } from "./icons";

export function GuestAccountCard({ returnUrl, title = "Inicia sesión para ver tu saldo", text = "Inicia sesión o crea tu cuenta para consultar tu progreso dentro de THERETOS." }: { returnUrl: string; title?: string; text?: string }) {
  const encoded = encodeURIComponent(returnUrl);
  return <aside className="guest-account-card"><IconUser /><div><small>GUARDA TU PROGRESO</small><h2>{title}</h2><p>{text}</p></div><div><Link href={`/login?returnTo=${encoded}`}>Iniciar sesión <IconArrow /></Link><Link href={`/signup?returnTo=${encoded}`}>Crear cuenta</Link></div></aside>;
}
export function ProtectedGate({ children, returnUrl, fallback }: { children: React.ReactNode; returnUrl: string; fallback?: React.ReactNode }) {
  const { isAuthenticated, isReady, logoutStatus } = useAuth(); const router = useRouter(); const pathname = usePathname();
  // AuthProvider owns redirects for the account routes, including logout.
  useEffect(() => { if (isReady && !isAuthenticated && !fallback && logoutStatus !== "pending" && !isProtectedAccountPath(pathname)) router.replace(`/login?returnTo=${encodeURIComponent(returnUrl)}`); }, [fallback, isAuthenticated, isReady, logoutStatus, pathname, returnUrl, router]);
  if (!isReady) return <div className="auth-loading" aria-live="polite">Cargando sesión...</div>;
  if (!isAuthenticated) return fallback ?? null;
  return children;
}
export function LogoutButton() {
  const { logout, logoutStatus, isAuthenticated, isReady } = useAuth();
  const pending = logoutStatus === "pending";
  return <button type="button" className="auth-logout" disabled={!isReady || !isAuthenticated || pending} aria-busy={pending} onClick={() => { void logout(); }}>
    {pending ? "Cerrando sesión..." : "Cerrar sesión"} <IconArrow />
  </button>;
}

export function LogoutFeedback() {
  const { logoutStatus, logoutMessage, isAuthenticated } = useAuth();
  const feedback = useRef<HTMLElement>(null);
  const visible = logoutStatus === "error" || (logoutStatus === "success" && !isAuthenticated);
  useEffect(() => {
    if (!visible) return;
    feedback.current?.focus({ preventScroll: true });
    feedback.current?.scrollIntoView({ block: "center", behavior: "auto" });
  }, [visible, logoutMessage]);
  if (!visible) return null;
  const failed = logoutStatus === "error";
  return <section ref={feedback} className={`account-notice ${failed ? "account-notice-error" : "account-notice-success"}`} role={failed ? "alert" : "status"} tabIndex={-1}>
    <h3>{failed ? "Revisa el cierre de sesión" : "Sesión cerrada"}</h3>
    <p>{logoutMessage}</p>
  </section>;
}
