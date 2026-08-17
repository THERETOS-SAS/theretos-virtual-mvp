"use client";

import Link from "next/link";
import { getCurrentPrizePool, type MockTournament } from "../data/mockTournaments";
import { mockGames } from "../data/mockGames";
import { CatalogGameIcon, isOfficialGameSlug } from "./games/CatalogGameIcon";
import { IconArrow, IconTrophy, IconUsers } from "./icons";
import { useAuth } from "./AuthProvider";
import { TournamentParticipateButton } from "./TournamentParticipateButton";

const statusLabels = {
  open: "Abierto",
  "almost-full": "Alta actividad",
  upcoming: "Próximamente",
} as const;

export function TournamentCard({ tournament }: { tournament: MockTournament }) {
  const { isAuthenticated, user } = useAuth();
  const game = mockGames.find((item) => item.slug === tournament.gameSlug);
  const missingTickets = Math.max(tournament.entryCost - (user?.etickets ?? 0), 0);
  const isUpcoming = tournament.status === "upcoming";
  const currentPrizePool = getCurrentPrizePool(tournament);

  return (
    <article className={`tournament-card tournament-card-${game?.accentColor ?? "gold"}`}>
      <div className="tournament-card-topline">
        <span className="tournament-card-visual" aria-hidden="true">
          {isOfficialGameSlug(tournament.gameSlug) && <CatalogGameIcon gameSlug={tournament.gameSlug} />}
        </span>
        <div className="tournament-card-title">
          {tournament.featured && <small>DESTACADO</small>}
          <h3>{tournament.gameName}</h3>
        </div>
        <span className={`tournament-status tournament-status-${tournament.status}`}>{statusLabels[tournament.status]}</span>
      </div>

      <dl className="tournament-card-stats tournament-card-stats-compact">
        <div><dt><IconUsers /> Participantes</dt><dd>{tournament.participants.toLocaleString("es-CO")}</dd></div>
        <div><dt><IconTrophy /> Pozo</dt><dd>{currentPrizePool.toLocaleString("es-CO")} eTickets</dd></div>
      </dl>

      {isAuthenticated && missingTickets > 0 && !isUpcoming && <p className="tournament-missing">Te falta {missingTickets} eTicket</p>}

      <div className="tournament-card-actions">
        {!isUpcoming ? (
          <TournamentParticipateButton tournamentId={tournament.id} className="tournament-enter-button" />
        ) : (
          <Link href={`/games/${tournament.gameSlug}`} className="tournament-upcoming-button">Ver torneo <IconArrow /></Link>
        )}
      </div>
    </article>
  );
}
