export type GameMode = "guest-practice" | "practice" | "tournament";

export type GameMetric = number | string | boolean;

export type GameResult = {
  gameSlug: string;
  score: number;
  durationMs: number;
  metrics: Record<string, GameMetric>;
  completed: boolean;
};

export type GamePhase = "ready" | "running" | "paused" | "completed";

export type GameEngineProps = {
  phase: GamePhase;
  onComplete: (result: GameResult) => void;
};
