"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";

export function RequireAuthAction({ children, returnUrl, message, className }: { children: React.ReactNode; returnUrl: string; message: string; className?: string }) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [open]);
  if (isAuthenticated) return null;
  const encoded = encodeURIComponent(returnUrl);
  return <><button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>{open && <div className="auth-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title"><button type="button" className="auth-modal-close" aria-label="Cerrar" onClick={() => setOpen(false)}>×</button><small>CUENTA THERETOS</small><h2 id="auth-modal-title">INICIA SESIÓN PARA CONTINUAR</h2><p>{message}</p><div><Link href={`/login?returnTo=${encoded}`}>Iniciar sesión</Link><Link href={`/signup?returnTo=${encoded}`}>Crear cuenta</Link><button type="button" onClick={() => setOpen(false)}>Cancelar</button></div></section></div>}</>;
}
