const scoreRanges: Record<string, readonly [number, number]> = {
  "atrapa-monedas": [4000, 10000],
  "tap-frenetico": [3000, 9000],
  "revienta-globos": [3000, 9000],
  "golpea-topos": [3000, 8000],
  // Compatibilidad con participaciones persistidas de prototipos anteriores.
  "tiro-perfecto": [3000, 9000],
  "memoria-flash": [3000, 8000],
};

// Resultado exclusivamente demostrativo. El motor real sustituirá esta función.
export function generateDemoTournamentScore(gameSlug: string) {
  const [minimum, maximum] = scoreRanges[gameSlug] ?? [3000, 8000];
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}
