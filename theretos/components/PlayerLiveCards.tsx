"use client";

import Link from "next/link";
import { IconArrow, IconCoins, IconGift, IconProgress, IconTrophy, IconUser } from "./icons";
import { useAuth } from "./AuthProvider";

export function ETicketsBalanceCard() {
  const { isReady, user } = useAuth();
  if (!isReady) return <div className="auth-loading etickets-balance-loading">Cargando saldo…</div>;
  if (!user) return <aside className="etickets-guest-balance"><IconCoins /><span>Inicia sesión para consultar tu saldo</span><Link href="/login?returnTo=%2Fetickets">Iniciar sesión</Link></aside>;
  return <aside className="etickets-balance-card etickets-balance-compact" aria-label="Saldo disponible"><IconCoins /><div><small>SALDO DISPONIBLE</small><strong>{user.etickets.toLocaleString("es-CO")} <span>eTickets</span></strong></div></aside>;
}

export function ProfileLiveOverview() {
  const { user } = useAuth();
  if (!user) return null;
  const progress = Math.min((user.xp / user.nextLevelXp) * 100, 100);
  const links = [{ title: "Mis eTickets", value: `${user.etickets} eTickets`, href: "/etickets", Icon: IconCoins, className: "profile-link-gold" }, { title: "Mi historial", value: "Participaciones y resultados", href: "/history", Icon: IconProgress, className: "profile-link-purple" }, { title: "Torneos", value: "Compite y mejora tu posición", href: "/tournaments", Icon: IconTrophy, className: "profile-link-gold" }, { title: "Premios", value: "Explora el Marketplace", href: "/marketplace", Icon: IconGift, className: "profile-link-purple" }, { title: "Mis premios", value: "Consulta tus solicitudes y premios entregados", href: "/my-prizes", Icon: IconGift, className: "profile-link-gold" }];
  return <><section className="profile-player-card"><div className="profile-player-heading"><span><IconUser /></span><div><small>JUGADOR DEMO</small><h2>{user.name}</h2></div><strong>NV. {user.level}</strong></div><dl className="profile-player-stats"><div><dt>XP</dt><dd>{user.xp.toLocaleString("en-US")}</dd></div><div><dt>eTickets</dt><dd>{user.etickets}</dd></div><div><dt>Nivel</dt><dd>{user.level}</dd></div></dl><div className="profile-level-progress"><div><span>Nivel {user.level}</span><strong>{user.xp.toLocaleString("en-US")} / {user.nextLevelXp.toLocaleString("en-US")} XP</strong></div><span><i style={{ width: `${progress}%` }} /></span></div><Link href="/etickets">Recargar eTickets <IconArrow /></Link></section><section className="profile-section"><div className="profile-section-heading"><span>MI THERETOS</span><h2>Accesos principales</h2></div><div className="profile-quick-grid">{links.map(({ title, value, href, Icon, className }) => <Link href={href} className={className} key={href}><span><Icon /></span><div><h3>{title}</h3><p>{value}</p></div><IconArrow /></Link>)}</div></section></>;
}

export function HistorySummary() {
  const { user, history } = useAuth();
  if (!user) return null;
  const tournamentCount = history.filter((item) => item.type === "tournament").length;
  const bestScore = Math.max(0, ...history.map((item) => item.score ?? 0));
  const stats = [{ label: "Participaciones en torneos", value: String(tournamentCount), Icon: IconTrophy }, { label: "Mejor puntuación", value: bestScore.toLocaleString("en-US"), Icon: IconProgress }, { label: "XP acumulado", value: user.xp.toLocaleString("en-US"), Icon: IconProgress }, { label: "eTickets", value: String(user.etickets), Icon: IconCoins }];
  return <section className="history-summary" aria-label="Resumen de actividad">{stats.map(({ label, value, Icon }) => <article key={label}><Icon /><small>{label}</small><strong>{value}</strong></article>)}</section>;
}
