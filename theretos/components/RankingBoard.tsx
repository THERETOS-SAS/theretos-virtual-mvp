"use client";

import Link from "next/link";
import { useState } from "react";
import { rankingDefinitions, type RankingCategory } from "../data/mockRanking";
import { IconArrow, IconChart, IconGamepad, IconProgress, IconTrophy, IconUser } from "./icons";
import { useAuth } from "./AuthProvider";
import { GuestAccountCard } from "./AuthUX";

const formatValue = (value: number) => value.toLocaleString("en-US");

export function RankingBoard() {
  const { isAuthenticated, isReady, user, history } = useAuth();
  const [category, setCategory] = useState<RankingCategory>("general");
  const definition = rankingDefinitions.find((item) => item.id === category)!;
  const savedBest = category === "general" ? 0 : Math.max(0, ...history.filter((item) => item.gameSlug === category).map((item) => item.score ?? 0));
  const ranking = { ...definition, players: definition.players.map((player) => player.isCurrentUser && savedBest > 0 ? { ...player, value: savedBest } : player).sort((a, b) => b.value - a.value) };
  const currentIndex = ranking.players.findIndex((player) => player.isCurrentUser);
  const current = ranking.players[currentIndex];
  const next = ranking.players[currentIndex - 1];
  const difference = next ? next.value - current.value : 0;
  const progress = next ? Math.min(100, (current.value / next.value) * 100) : 100;
  const visiblePlayers = isAuthenticated ? ranking.players : ranking.players.filter((player) => !player.isCurrentUser);
  if (!isReady) return <div className="auth-loading">Cargando sesión...</div>;

  return (
    <>
      {isAuthenticated && user ? <section className="ranking-player-card" aria-labelledby="my-position-title">
        <div className="ranking-player-heading"><span><IconUser /></span><div><small id="my-position-title">TU POSICIÓN</small><p className="ranking-position-scope">RANKING GENERAL</p><h2>{user.name}</h2><p>NV. {user.level}</p></div><strong>#18</strong></div>
        <dl><div><dt>XP</dt><dd>{formatValue(user.xp)}</dd></div><div><dt>Mejor puntuación</dt><dd>8,420</dd></div><div><dt>Juego destacado</dt><dd>Atrapa Monedas</dd></div></dl>
        <div className="ranking-xp-progress"><div><span>Progreso de XP</span><strong>{formatValue(user.xp)} / {formatValue(user.nextLevelXp)} XP</strong></div><span><i style={{ width: `${(user.xp / user.nextLevelXp) * 100}%` }} /></span></div>
        <div className="ranking-player-actions"><Link href="/history">Ver mi historial <IconArrow /></Link><Link href="/virtual">Seguir jugando <IconArrow /></Link></div>
      </section> : <GuestAccountCard returnUrl="/ranking" title="¿Quieres aparecer en el ranking?" text="Inicia sesión, guarda tus resultados y comienza a escalar posiciones." />}

      <section className="ranking-classification" aria-labelledby="ranking-list-title">
        <div className="ranking-section-heading"><span>ELIGE EL RANKING</span><h2 id="ranking-list-title">CLASIFICACIÓN</h2></div>
        <div className="ranking-tabs" role="tablist" aria-label="Categorías del ranking">
          {rankingDefinitions.map((item) => <button key={item.id} type="button" role="tab" aria-selected={category === item.id} className={category === item.id ? "active" : undefined} onClick={() => setCategory(item.id)}>{item.label}</button>)}
        </div>
        <div className="ranking-list-heading"><div><IconChart /><span>{ranking.title}</span></div><small>VALOR PRINCIPAL · {ranking.metric}</small></div>
        <div className="ranking-top-three">
          {visiblePlayers.slice(0, 3).map((player, index) => <article className={`ranking-top ranking-top-${index + 1}`} key={player.id}><span>#{index + 1}</span><div><h3>{player.name}</h3><p>{formatValue(player.value)} {ranking.metric === "XP" ? "XP" : "PTS"}</p></div><strong>NV. {player.level}</strong></article>)}
        </div>
        <ol className="ranking-list" start={4}>
          {visiblePlayers.slice(3).map((player, offset) => <li className={player.isCurrentUser ? "is-current" : undefined} key={player.id}><span>#{String(offset + 4).padStart(2, "0")}</span><div><strong>{player.name}</strong>{player.isCurrentUser && <em>TÚ</em>}</div><small>NV. {player.level}</small><b>{formatValue(player.value)} {ranking.metric === "XP" ? "XP" : "PTS"}</b></li>)}
        </ol>
      </section>

      {isAuthenticated && <section className="ranking-next-card" aria-labelledby="ranking-next-title"><div className="ranking-next-icon"><IconProgress /></div><div className="ranking-next-copy"><span>SIGUE SUBIENDO</span><h2 id="ranking-next-title">ESTÁS A UN PASO DE ESCALAR.</h2><p>Sigue practicando y compitiendo para mejorar tu posición.</p></div><dl><div><dt>Tu posición</dt><dd>#{currentIndex + 1}</dd></div><div><dt>Siguiente posición</dt><dd>#{Math.max(1, currentIndex)}</dd></div><div><dt>Diferencia</dt><dd>{formatValue(difference)} {ranking.metric === "XP" ? "XP" : "PTS"}</dd></div></dl><div className="ranking-next-progress"><span><i style={{ width: `${progress}%` }} /></span></div><div className="ranking-next-actions"><Link href="/virtual"><IconGamepad /> Jugar ahora</Link><Link href="/tournaments"><IconTrophy /> Competir en torneos</Link></div></section>}
    </>
  );
}
