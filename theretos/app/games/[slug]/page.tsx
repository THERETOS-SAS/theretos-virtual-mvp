import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BackLink } from "../../../components/BackLink";
import { Footer } from "../../../components/Footer";
import { GameAccordions } from "../../../components/GameAccordions";
import { GameIcon } from "../../../components/GameIcon";
import { Header } from "../../../components/Header";
import { IconGamepad, IconTrophy } from "../../../components/icons";
import { MobileNavigation } from "../../../components/MobileNavigation";
import { allMockGames } from "../../../data/mockGames";
import { TournamentGameFlow } from "../../../components/TournamentGameFlow";
import { GamePlayerStrip } from "../../../components/GamePlayerStrip";
import { GameGuestNotice } from "../../../components/GameGuestNotice";

type GamePageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ mode?: string | string[] }>;
};

export function generateStaticParams() {
  return allMockGames.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = allMockGames.find((item) => item.slug === slug);

  if (!game) return { title: "Juego no encontrado | THERETOS" };

  return {
    title: `${game.name} | THERETOS Virtual`,
    description: game.description,
  };
}

export default async function GameDetailPage({ params, searchParams }: GamePageProps) {
  const [{ slug }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ mode?: string | string[] }>({}),
  ]);
  const game = allMockGames.find((item) => item.slug === slug);

  if (!game) notFound();

  const requestedMode = Array.isArray(query.mode) ? query.mode[0] : query.mode;
  const isGameMode = requestedMode === "practice" || requestedMode === "tournament";

  if (isGameMode) {
    const isTournamentMode = requestedMode === "tournament";
    return (
      <main className={`game-room-page game-room-${requestedMode}`}>
        <div className="game-room-shell">
          <nav className="game-room-nav" aria-label="Salir del modo juego">
            <BackLink href={isTournamentMode ? "/tournaments" : "/virtual#games-title"} label={isTournamentMode ? "Torneos" : "Juegos"} />
          </nav>
          <Suspense fallback={<section className="tournament-game-mode tournament-game-loading"><p>Preparando juego…</p></section>}>
            <TournamentGameFlow gameSlug={game.slug} gameName={game.name} />
          </Suspense>
        </div>
      </main>
    );
  }

  return (
    <main className="site-shell game-detail-page">
      <Header active="virtual" />

      <div className="game-detail-content">
        <nav className="game-detail-breadcrumb" aria-label="Migas de pan">
          <Link href="/virtual">THERETOS Virtual</Link>
          <span aria-hidden="true">›</span>
          <Link href="/virtual#games-title">Juegos</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{game.name}</span>
        </nav>

        <BackLink href="/virtual" label="Juegos" />

        <Suspense fallback={<section className="tournament-game-mode tournament-game-loading"><p>Validando participación…</p></section>}>
          <TournamentGameFlow gameSlug={game.slug} gameName={game.name} />
        </Suspense>

        <section className="game-detail-hero" aria-labelledby="game-title">
          <div className={`game-detail-art virtual-game-${game.accentColor}`} aria-hidden="true">
            <span><GameIcon icon={game.icon} /></span>
          </div>

          <div className="game-detail-copy">
            <span className="game-detail-category">{game.category}</span>
            <h1 id="game-title">{game.name}</h1>
            <p>{game.description}</p>
            <div className="game-detail-best">
              <small>MEJOR PUNTUACIÓN</small>
              <strong>{game.highScore}</strong>
            </div>
          </div>

          <div className="game-detail-actions">
            <Link href={`/games/${game.slug}?mode=practice`} className="game-detail-practice">
              <IconGamepad />
              <span><strong>Práctica</strong><small>Juega libre</small></span>
            </Link>
            <Link href={`/tournaments?game=${game.slug}`} className="game-detail-tournaments">
              <IconTrophy />
              <span><strong>Torneos</strong><small>1 eTicket/participación</small></span>
            </Link>
          </div>
        </section>

        <aside className="game-practice-note">
          <IconGamepad />
          <p><strong>PRÁCTICA LIBRE · Disponible gratis, incluso sin crear una cuenta.</strong><span>El XP, los récords y el progreso solo se guardan cuando inicias sesión.</span></p>
        </aside>

        <GameGuestNotice gamePath={`/games/${game.slug}?mode=practice`} />

        <aside className="game-tournament-note">
          <IconTrophy />
          <p><strong>TORNEOS · 1 eTicket por participación.</strong><span>Con una cuenta puedes participar tantas veces como quieras mientras tengas saldo. Tu mejor resultado cuenta.</span></p>
        </aside>

        <GamePlayerStrip gameSlug={game.slug} initialHighScore={game.highScore} />

        <section className="game-detail-info" aria-label={`Información de ${game.name}`}>
          <GameAccordions game={game} />
        </section>
      </div>

      <Footer />
      <MobileNavigation active="games" gamesHref="/virtual" />
    </main>
  );
}
