"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export function GameGuestNotice({ gamePath }: { gamePath: string }) {
  const { isAuthenticated, isReady } = useAuth();
  if (!isReady || isAuthenticated) return null;
  return <aside className="game-guest-notice"><p><strong>Estás jugando como invitado.</strong> Inicia sesión para guardar tu progreso.</p><Link href={`/login?returnTo=${encodeURIComponent(gamePath)}`}>Iniciar sesión</Link></aside>;
}
