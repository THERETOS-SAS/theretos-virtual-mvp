export type TournamentStatus = "open" | "almost-full" | "upcoming";
export const DEFAULT_TOURNAMENT_ENTRY_COST = 1;

export type MockTournament = {
  id: string;
  slug: string;
  name: string;
  gameSlug: string;
  gameName: string;
  entryCost: number;
  participants: number;
  maxPlayers: number;
  duration: string;
  timeRemaining: string;
  status: TournamentStatus;
  featured: boolean;
};

// Datos demostrativos. Valores, nombres y disponibilidad no son definitivos.
export const mockTournaments: MockTournament[] = [
  {
    id: "tournament-001",
    slug: "desafio-relampago",
    name: "Desafío relámpago",
    gameSlug: "atrapa-monedas",
    gameName: "Atrapa Monedas",
    entryCost: DEFAULT_TOURNAMENT_ENTRY_COST,
    participants: 18,
    maxPlayers: 32,
    duration: "1 día",
    timeRemaining: "Finaliza hoy",
    status: "open",
    featured: true,
  },
  {
    id: "tournament-002",
    slug: "precision-total",
    name: "Precisión total",
    gameSlug: "revienta-globos",
    gameName: "Revienta Globos",
    entryCost: DEFAULT_TOURNAMENT_ENTRY_COST,
    participants: 29,
    maxPlayers: 32,
    duration: "1 día",
    timeRemaining: "Finaliza hoy",
    status: "almost-full",
    featured: false,
  },
  {
    id: "tournament-003",
    slug: "reaccion-total",
    name: "Reacción total",
    gameSlug: "tap-frenetico",
    gameName: "Tap Frenético",
    entryCost: DEFAULT_TOURNAMENT_ENTRY_COST,
    participants: 24,
    maxPlayers: 32,
    duration: "1 día",
    timeRemaining: "Finaliza hoy",
    status: "open",
    featured: false,
  },
  {
    id: "tournament-004",
    slug: "reto-express",
    name: "Reto express",
    gameSlug: "golpea-topos",
    gameName: "Golpea Topos",
    entryCost: DEFAULT_TOURNAMENT_ENTRY_COST,
    participants: 7,
    maxPlayers: 16,
    duration: "1 día",
    timeRemaining: "Finaliza hoy",
    status: "open",
    featured: false,
  },
  {
    id: "tournament-005",
    slug: "dominio-total",
    name: "Dominio total",
    gameSlug: "bolas",
    gameName: "Bolas",
    entryCost: DEFAULT_TOURNAMENT_ENTRY_COST,
    participants: 12,
    maxPlayers: 32,
    duration: "1 día",
    timeRemaining: "Finaliza hoy",
    status: "open",
    featured: false,
  },
];

export const getCurrentPrizePool = (tournament: MockTournament) =>
  tournament.entryCost * tournament.participants;

export const getMaximumPrizePool = (tournament: MockTournament) =>
  tournament.entryCost * tournament.maxPlayers;
