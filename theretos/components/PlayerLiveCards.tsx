"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { readOwnPlayerProgress, type PlayerProgressResult } from "@/lib/supabase/player-progress";
import { IconArrow, IconCoins, IconGift, IconProgress, IconTrophy, IconUser } from "./icons";
import { useAuth } from "./AuthProvider";

export function ETicketsBalanceCard() {
  const { isReady, user } = useAuth();
  if (!isReady) return <div className="auth-loading etickets-balance-loading">Cargando saldo…</div>;
  if (!user) return <aside className="etickets-guest-balance"><IconCoins /><span>Inicia sesión para consultar tu saldo</span><Link href="/login?returnTo=%2Fetickets">Iniciar sesión</Link></aside>;
  return <aside className="etickets-balance-card etickets-balance-compact" aria-label="Saldo disponible"><IconCoins /><div><small>SALDO DISPONIBLE</small><strong>{user.etickets.toLocaleString("es-CO")} <span>eTickets</span></strong></div></aside>;
}

export function ProfileLiveOverview() {
  const { user, isReady, sessionUserId } = useAuth();
  if (!isReady) return <ProfileProgressLoading />;
  if (!user || !sessionUserId) return <ProfileProgressSignIn />;
  // A different account gets fresh state before any progress can be rendered.
  return <ProfileProgressOverview key={sessionUserId} name={user.name} sessionUserId={sessionUserId} />;
}

function ProfileProgressLoading() {
  return <section className="profile-player-card" aria-busy="true"><p role="status">Cargando tu progreso…</p></section>;
}

function ProfileProgressSignIn() {
  return <section className="profile-player-card"><p role="status">Inicia sesión para consultar tu progreso.</p><Link href="/login?returnTo=%2Fprofile">Iniciar sesión <IconArrow /></Link></section>;
}

function ProfileProgressOverview({ name, sessionUserId }: { name: string; sessionUserId: string }) {
  const [result, setResult] = useState<PlayerProgressResult | { status: "loading" }>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      let next: PlayerProgressResult;
      try {
        next = await readOwnPlayerProgress(createClient());
      } catch {
        next = { status: "error" };
      }
      if (active) setResult(next);
    }
    void load();
    return () => { active = false; };
  }, [attempt]);

  if (result.status === "loading") return <ProfileProgressLoading />;
  if (result.status === "unauthenticated" || (result.status === "ready" && result.userId !== sessionUserId)) {
    return <ProfileProgressSignIn />;
  }
  if (result.status !== "ready") {
    return <section className="profile-player-card"><div><p role="alert">{result.status === "missing"
      ? "No encontramos tu progreso. Inténtalo de nuevo. Si el problema continúa, contacta soporte."
      : "No pudimos cargar tu progreso. Revisa tu conexión e inténtalo de nuevo."}</p><button type="button" onClick={() => {
      setResult({ status: "loading" });
      setAttempt((value) => value + 1);
    }}>Reintentar</button></div></section>;
  }

  const { level, xp_total, tickets_balance } = result.progress;
  // Core v1 has no next-level XP rule. Keep the bar without a demo target.
  // games_played is read too; the current profile has no visible games counter.
  const links = [{ title: "Mis eTickets", value: `${tickets_balance} eTickets`, href: "/etickets", Icon: IconCoins, className: "profile-link-gold" }, { title: "Mi historial", value: "Participaciones y resultados", href: "/history", Icon: IconProgress, className: "profile-link-purple" }, { title: "Torneos", value: "Compite y mejora tu posición", href: "/tournaments", Icon: IconTrophy, className: "profile-link-gold" }, { title: "Premios", value: "Explora el Marketplace", href: "/marketplace", Icon: IconGift, className: "profile-link-purple" }, { title: "Mis premios", value: "Consulta tus solicitudes y premios entregados", href: "/my-prizes", Icon: IconGift, className: "profile-link-gold" }];
  return <><section className="profile-player-card"><div className="profile-player-heading"><span><IconUser /></span><div><small>JUGADOR THERETOS</small><h2>{name}</h2></div><strong>NV. {level}</strong></div><dl className="profile-player-stats"><div><dt>XP</dt><dd>{xp_total.toLocaleString("en-US")}</dd></div><div><dt>eTickets</dt><dd>{tickets_balance}</dd></div><div><dt>Nivel</dt><dd>{level}</dd></div></dl><div className="profile-level-progress" title="Meta del siguiente nivel aún no disponible"><div><span>Nivel {level}</span><strong>{xp_total.toLocaleString("en-US")} / — XP</strong></div><span aria-label="Meta del siguiente nivel aún no disponible"><i style={{ width: "0%" }} /></span></div><Link href="/virtual">Jugar y ganar eTickets <IconArrow /></Link></section><section className="profile-section"><div className="profile-section-heading"><span>MI THERETOS</span><h2>Accesos principales</h2></div><div className="profile-quick-grid">{links.map(({ title, value, href, Icon, className }) => <Link href={href} className={className} key={href}><span><Icon /></span><div><h3>{title}</h3><p>{value}</p></div><IconArrow /></Link>)}</div></section></>;
}

export function HistorySummary() {
  const { user, history } = useAuth();
  if (!user) return null;
  const tournamentCount = history.filter((item) => item.type === "tournament").length;
  const bestScore = Math.max(0, ...history.map((item) => item.score ?? 0));
  const stats = [{ label: "Participaciones en torneos", value: String(tournamentCount), Icon: IconTrophy }, { label: "Mejor puntuación", value: bestScore.toLocaleString("en-US"), Icon: IconProgress }, { label: "XP acumulado", value: user.xp.toLocaleString("en-US"), Icon: IconProgress }, { label: "eTickets", value: String(user.etickets), Icon: IconCoins }];
  return <section className="history-summary" aria-label="Resumen de actividad">{stats.map(({ label, value, Icon }) => <article key={label}><Icon /><small>{label}</small><strong>{value}</strong></article>)}</section>;
}
