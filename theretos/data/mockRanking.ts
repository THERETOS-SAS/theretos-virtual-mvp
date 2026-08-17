export type RankingCategory = "general" | "atrapa-monedas" | "tap-frenetico" | "revienta-globos" | "golpea-topos" | "bolas";

export type RankingPlayer = { id: string; name: string; level: number; value: number; isCurrentUser?: boolean };
export type RankingDefinition = { id: RankingCategory; label: string; title: string; metric: "XP" | "PUNTUACIÓN"; players: readonly RankingPlayer[] };

const generalEntries = [
  ["vector", "Vector", 14, 5820], ["lunapro", "LunaPro", 13, 5430], ["kairo", "Kairo", 12, 4980], ["neorunner", "NeoRunner", 11, 4610], ["flashzero", "FlashZero", 11, 4280], ["pixelfox", "PixelFox", 10, 3950], ["maxplay", "MaxPlay", 10, 3720], ["turbox", "TurboX", 9, 3480], ["raptor", "Raptor", 9, 3260], ["nova", "Nova", 9, 3080], ["orbit", "Orbit", 9, 2940], ["zenith", "Zenith", 8, 2860], ["vortex", "Vortex", 8, 2780], ["pixelnova", "PixelNova", 8, 2690], ["storm", "Storm", 8, 2610], ["nex", "Nex", 8, 2550], ["ray", "Ray", 8, 2630], ["current", "Jugador demo", 8, 2450],
] as const;

const gameEntries = [
  ["vector", "Vector", 14, 12840], ["nova", "Nova", 9, 11920], ["lunapro", "LunaPro", 13, 10760], ["turbox", "TurboX", 9, 9980], ["current", "Jugador demo", 8, 8420], ["pixelfox", "PixelFox", 10, 8110], ["kairo", "Kairo", 12, 7840],
] as const;

function players(entries: readonly (readonly [string, string, number, number])[]) {
  return entries.map(([id, name, level, value]) => ({ id, name, level, value, isCurrentUser: id === "current" }));
}

export const rankingDefinitions: readonly RankingDefinition[] = [
  { id: "general", label: "General", title: "Ranking general", metric: "XP", players: players(generalEntries).sort((a, b) => b.value - a.value) },
  { id: "atrapa-monedas", label: "Atrapa Monedas", title: "Ranking · Atrapa Monedas", metric: "PUNTUACIÓN", players: players(gameEntries) },
  { id: "tap-frenetico", label: "Tap Frenético", title: "Ranking · Tap Frenético", metric: "PUNTUACIÓN", players: players(gameEntries) },
  { id: "revienta-globos", label: "Revienta Globos", title: "Ranking · Revienta Globos", metric: "PUNTUACIÓN", players: players(gameEntries) },
  { id: "golpea-topos", label: "Golpea Topos", title: "Ranking · Golpea Topos", metric: "PUNTUACIÓN", players: players(gameEntries) },
  { id: "bolas", label: "Bolas", title: "Ranking · Bolas", metric: "PUNTUACIÓN", players: players(gameEntries) },
];
