"use client";

import { useState } from "react";
import Link from "next/link";
import type { MockGame } from "../data/mockGames";
import { IconArrow } from "./icons";
import { useAuth } from "./AuthProvider";

type AccordionKey = "information" | "instructions" | "prizes" | "ranking";

export function GameAccordions({ game }: { game: MockGame }) {
  const { isAuthenticated, user } = useAuth();
  const [openSection, setOpenSection] = useState<AccordionKey | null>(null);

  const toggle = (section: AccordionKey) => {
    setOpenSection((current) => current === section ? null : section);
  };

  const sections: { key: AccordionKey; label: string; content: React.ReactNode }[] = [
    {
      key: "information",
      label: "Información",
      content: <p>{game.longDescription}</p>,
    },
    {
      key: "instructions",
      label: "Cómo se juega",
      content: (
        <ol className="game-detail-instructions">
          {game.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
        </ol>
      ),
    },
    {
      key: "prizes",
      label: "Premios",
      content: (
        <div>
          <p>Los torneos pueden otorgar eTickets y acceso a premios según las reglas de cada competencia.</p>
          <Link href="/tournaments" className="game-accordion-link">Ver torneos <IconArrow /></Link>
        </div>
      ),
    },
    {
      key: "ranking",
      label: "Ranking",
      content: (
        <div>
          <ol className="game-detail-ranking">
            {game.ranking.filter(({ player }) => isAuthenticated || player.toLowerCase() !== "jugador demo").map(({ position, player, score }) => (
              <li key={player}>
                <span>{position}</span><strong>{player.toLowerCase() === "jugador demo" ? user?.name ?? player : player}</strong><em>{score}</em>
              </li>
            ))}
          </ol>
          <Link href="/ranking" className="game-accordion-link">Ver ranking completo <IconArrow /></Link>
        </div>
      ),
    },
  ];

  return (
    <div className="game-accordions">
      {sections.map(({ key, label, content }) => {
        const isOpen = openSection === key;
        const panelId = `game-panel-${key}`;
        return (
          <section className={`game-accordion${isOpen ? " game-accordion-open" : ""}`} key={key}>
            <h2>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(key)}
              >
                <span>{label}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </button>
            </h2>
            {isOpen && <div className="game-accordion-panel" id={panelId}>{content}</div>}
          </section>
        );
      })}
    </div>
  );
}
