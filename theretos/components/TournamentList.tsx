"use client";

import { useState } from "react";
import { TournamentCard } from "./TournamentCard";
import { useAuth } from "./AuthProvider";

type StatusFilter = "all" | "open" | "upcoming";

export function TournamentList() {
  const { tournaments } = useAuth();
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = tournaments.filter((tournament) =>
    status === "all"
    || (status === "open" && tournament.status !== "upcoming")
    || (status === "upcoming" && tournament.status === "upcoming")
  );

  return (
    <>
      <div className="tournament-filters">
        <div className="tournament-filter-chips" aria-label="Filtrar por estado">
          {(["all", "open", "upcoming"] as const).map((value) => (
            <button
              type="button"
              className={status === value ? "active" : undefined}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
              key={value}
            >
              {value === "all" ? "Todos" : value === "open" ? "Abiertos" : "Próximos"}
            </button>
          ))}
        </div>
      </div>

      <div className="tournament-grid">
        {filtered.map((tournament) => (
          <TournamentCard tournament={tournament} key={tournament.id} />
        ))}
      </div>
    </>
  );
}

