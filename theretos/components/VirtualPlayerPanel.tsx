"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export function VirtualGuestPrompt() {
  const { isAuthenticated, isReady } = useAuth();
  if (!isReady || isAuthenticated) return null;

  return (
    <aside className="virtual-guest-prompt">
      <span>¿Quieres guardar tu récord?</span>
      <Link href="/login?returnTo=%2Fvirtual">Inicia sesión</Link>
    </aside>
  );
}

