"use client";

import Link from "next/link";
import { IconCoins } from "./icons";
import { useAuth } from "./AuthProvider";

export function GamePlayerStrip({ gameSlug, initialHighScore }: { gameSlug: string; initialHighScore: string }) {
  const { user, history } = useAuth();
  const savedBest = Math.max(0, ...history.filter((item) => item.gameSlug === gameSlug).map((item) => item.score ?? 0));
  const initialScore = Number(initialHighScore.replace(/,/g, "")) || 0;
  const bestScore = Math.max(initialScore, savedBest);
  return <section className="game-player-strip" aria-label="Estado del jugador"><div><small>Mejor puntuación</small><strong>{bestScore.toLocaleString("en-US")}</strong></div><div className="game-player-xp"><small>XP</small><strong>{user ? user.xp.toLocaleString("en-US") : "—"}</strong></div><div className="game-player-tickets"><small>eTickets</small><strong>{user?.etickets ?? "—"}</strong></div><Link href="/etickets"><IconCoins />Recargar</Link></section>;
}
