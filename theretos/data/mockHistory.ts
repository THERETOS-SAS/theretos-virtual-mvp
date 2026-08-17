export type HistoryEntry = {
  id: string;
  type: "tournament" | "practice";
  game: string;
  tournament?: string;
  tournamentId?: string;
  tournamentName?: string;
  gameName?: string;
  gameSlug?: string;
  score?: number;
  position?: number;
  date: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  entryCost?: number;
  xp?: number;
  status?: "pending" | "playing" | "completed";
  durationMs?: number;
  metrics?: Record<string, number | string | boolean>;
};

export const mockHistory: HistoryEntry[] = [
  { id: "history-1", type: "tournament", game: "Atrapa monedas", tournament: "Desafío Relámpago", score: 8420, position: 4, date: "Hoy", entryCost: DEFAULT_TOURNAMENT_ENTRY_COST, xp: 120 },
  { id: "history-2", type: "tournament", game: "Revienta Globos", gameName: "Revienta Globos", gameSlug: "revienta-globos", tournament: "Precisión Total", score: 6780, position: 12, date: "Ayer", entryCost: DEFAULT_TOURNAMENT_ENTRY_COST, xp: 80 },
  { id: "history-3", type: "practice", game: "Tap Frenético", gameName: "Tap Frenético", gameSlug: "tap-frenetico", score: 5950, date: "12 ago", xp: 45 },
];
import { DEFAULT_TOURNAMENT_ENTRY_COST } from "./mockTournaments";
