"use client";

import Link from "next/link";
import { mockRedemptionSummary } from "../data/mockRedemptions";
import { IconArrow, IconCoins, IconGift } from "./icons";
import { useAuth } from "./AuthProvider";

export function MyPrizesSummary() {
  const { user } = useAuth();
  if (!user) return null;
  return <section className="my-prizes-summary" aria-label="Resumen de canjes"><div className="my-prizes-player"><span><IconGift /></span><div><small>JUGADOR</small><h2>{user.name}</h2></div><strong>NV. {user.level}</strong></div><dl><div><dt>Saldo actual</dt><dd><IconCoins /> {user.etickets} eTickets</dd></div><div><dt>Canjes realizados</dt><dd>{mockRedemptionSummary.total}</dd></div><div><dt>En proceso</dt><dd>{mockRedemptionSummary.inProgress}</dd></div><div><dt>Entregados</dt><dd>{mockRedemptionSummary.delivered}</dd></div></dl><Link href="/marketplace">Explorar premios <IconArrow /></Link></section>;
}
