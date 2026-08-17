"use client";

import Link from "next/link";
import type { MockGame } from "../data/mockGames";
import { GameIcon } from "./GameIcon";
import { CatalogGameIcon, isOfficialGameSlug } from "./games/CatalogGameIcon";
import { useAuth } from "./AuthProvider";

export function GameCard({
  slug,
  name,
  category,
  description,
  accentColor,
  icon,
}: MockGame) {
  const { isAuthenticated, history } = useAuth();
  const gameHref = `/games/${slug}?mode=practice`;
  const normalizedName = name.toLocaleLowerCase("es");
  const bestScore = Math.max(
    0,
    ...history
      .filter((entry) =>
        entry.gameSlug === slug
        || entry.gameName?.toLocaleLowerCase("es") === normalizedName
        || entry.game.toLocaleLowerCase("es") === normalizedName
      )
      .map((entry) => entry.score ?? 0),
  );

  return (
    <article className={`virtual-game-card virtual-practice-card virtual-game-${accentColor}`}>
      <div className="virtual-game-art" aria-hidden="true">
        <span>
          {isOfficialGameSlug(slug)
            ? <CatalogGameIcon gameSlug={slug} />
            : <GameIcon icon={icon} />}
        </span>
      </div>
      <div className="virtual-game-copy">
        <span className="virtual-game-category">{category}</span>
        <h3>{name}</h3>
        <p>{description}</p>
        {isAuthenticated && (
          <div className="virtual-game-score">
            <small>MEJOR MARCA</small>
            <strong>{bestScore > 0 ? bestScore.toLocaleString("es-CO") : "Sin marca"}</strong>
          </div>
        )}
      </div>
      <div className="virtual-game-actions">
        <Link href={gameHref} className="virtual-practice-button">
          <span>Jugar gratis</span>
        </Link>
      </div>
    </article>
  );
}
