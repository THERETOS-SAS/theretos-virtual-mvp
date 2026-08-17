"use client";

import Link from "next/link";
import { IconArrow, IconCoins } from "./icons";
import { useAuth } from "./AuthProvider";

export function TournamentBalance() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <aside className="tournaments-balance tournaments-balance-compact" aria-label="Saldo disponible">
      <span className="tournaments-balance-icon"><IconCoins /></span>
      <div>
        <small>SALDO DISPONIBLE</small>
        <strong>{user.etickets.toLocaleString("es-CO")} eTickets</strong>
      </div>
      <Link href="/etickets">Recargar <IconArrow /></Link>
    </aside>
  );
}

