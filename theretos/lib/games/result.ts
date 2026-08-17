import type { GameResult } from "../../types/games";

export function createGameResult(
  gameSlug: string,
  score: number,
  durationMs: number,
  metrics: GameResult["metrics"],
): GameResult {
  return {
    gameSlug,
    score: Math.max(0, Math.round(score)),
    durationMs: Math.max(0, Math.round(durationMs)),
    metrics,
    completed: true,
  };
}
