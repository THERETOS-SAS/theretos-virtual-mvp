"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { IconArrow, IconUser } from "./icons";

export function GuestAccountCard({ returnUrl, title = "Inicia sesión para ver tu saldo", text = "Inicia sesión o crea tu cuenta para consultar tu progreso dentro de THERETOS." }: { returnUrl: string; title?: string; text?: string }) {
  const encoded = encodeURIComponent(returnUrl);
  return <aside className="guest-account-card"><IconUser /><div><small>GUARDA TU PROGRESO</small><h2>{title}</h2><p>{text}</p></div><div><Link href={`/login?returnTo=${encoded}`}>Iniciar sesión <IconArrow /></Link><Link href={`/signup?returnTo=${encoded}`}>Crear cuenta</Link></div></aside>;
}
export function ProtectedGate({ children, returnUrl, fallback }: { children: React.ReactNode; returnUrl: string; fallback?: React.ReactNode }) {
  const { isAuthenticated, isReady } = useAuth(); const router = useRouter();
  useEffect(() => { if (isReady && !isAuthenticated && !fallback) router.replace(`/login?returnTo=${encodeURIComponent(returnUrl)}`); }, [fallback, isAuthenticated, isReady, returnUrl, router]);
  if (!isReady) return <div className="auth-loading" aria-live="polite">Cargando sesión...</div>;
  if (!isAuthenticated) return fallback ?? null;
  return children;
}
export function LogoutButton() { const { logout } = useAuth(); const router = useRouter(); return <button type="button" className="auth-logout" onClick={() => { logout(); router.push("/"); }}>Cerrar sesión <IconArrow /></button>; }
