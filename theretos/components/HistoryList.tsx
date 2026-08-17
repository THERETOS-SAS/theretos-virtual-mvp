"use client";

import { useState } from "react";
import Link from "next/link";
import type { HistoryEntry } from "../data/mockHistory";
import { IconArrow, IconGamepad, IconTrophy } from "./icons";
import { useAuth } from "./AuthProvider";

type Filter = "all" | HistoryEntry["type"];

export function HistoryList() {
  const { history } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const visible = history.filter((item) => filter === "all" || item.type === filter);
  return <><div className="history-filters" role="group" aria-label="Filtrar historial">{(["all", "tournament", "practice"] as const).map((value) => <button type="button" className={filter === value ? "active" : undefined} aria-pressed={filter === value} onClick={() => setFilter(value)} key={value}>{value === "all" ? "Todos" : value === "tournament" ? "Torneos" : "Práctica"}</button>)}</div>{visible.length ? <div className="history-list">{visible.map((item) => {
    const costLabel = item.type === "practice" ? "Gratis" : item.entryCost ? `${item.entryCost} ${item.entryCost === 1 ? "eTicket" : "eTickets"}` : "Entrada no disponible";
    const activeAttempt = item.status === "pending" || item.status === "playing";
    return <article className={activeAttempt ? "history-participation-pending" : undefined} key={item.id}><span className={item.type === "tournament" ? "history-icon-gold" : "history-icon-green"}>{item.type === "tournament" ? <IconTrophy /> : <IconGamepad />}</span><div className="history-main"><small>{activeAttempt ? "PARTICIPACIÓN REGISTRADA" : item.status === "completed" ? "RESULTADO REGISTRADO" : item.type === "tournament" ? item.tournament : "Práctica con cuenta"}</small><h3>{item.game}</h3><p>{item.date} · {costLabel}{item.tournament ? ` · ${item.tournament}` : ""}</p>{activeAttempt && item.gameSlug && <Link className="history-play-now" href={`/games/${item.gameSlug}?mode=tournament&participation=${encodeURIComponent(item.id)}`}>{item.status === "playing" ? "Continuar intento" : "Jugar ahora"} <IconArrow /></Link>}</div>{activeAttempt ? <dl><div><dt>Estado</dt><dd>{item.status === "playing" ? "Intento en curso" : "Pendiente de jugar"}</dd></div></dl> : <dl><div><dt>Puntuación</dt><dd>{(item.score ?? 0).toLocaleString("en-US")}</dd></div>{item.position && <div><dt>Posición</dt><dd>#{item.position}</dd></div>}<div><dt>{item.status === "completed" ? "Estado" : "XP"}</dt><dd>{item.status === "completed" ? "Completado" : `+${item.xp ?? 0}`}</dd></div></dl>}</article>;
  })}</div> : <section className="history-empty"><h2>Aún no hay resultados</h2><p>Empieza practicando o entra a tu primer torneo.</p><div><Link href="/virtual">Practicar</Link><Link href="/tournaments">Ver torneos</Link></div></section>}</>;
}
