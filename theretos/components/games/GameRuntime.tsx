"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { isPlayableGameSlug } from "../../lib/games/registry";
import type { GameMode, GamePhase, GameResult } from "../../types/games";
import { RegisteredGameEngine } from "./RegisteredGameEngine";
import { CatalogGameIcon } from "./CatalogGameIcon";

type Props = {
  gameSlug: string;
  gameName: string;
  mode: GameMode;
  onComplete?: (result: GameResult) => void;
  autoStart?: boolean;
  allowRestart?: boolean;
};

const metricLabels: Record<string, string> = {
  taps: "Taps",
  tapsPerSecond: "Taps por segundo",
  popped: "Reventados",
  escaped: "Escapados",
  accuracy: "Precisión",
  hits: "Golpes",
  misses: "Fallados",
  coinsCaught: "Monedas",
  bombsHit: "Bombas",
  objectsMissed: "Objetos perdidos",
  levelReached: "Nivel alcanzado",
  livesRemaining: "Vidas restantes",
  obstaclesCleared: "Obstáculos eliminados",
};

export function GameRuntime({ gameSlug, gameName, mode, onComplete, autoStart = false, allowRestart = mode !== "tournament" }: Props) {
  const [phase, setPhase] = useState<GamePhase>(autoStart ? "running" : "ready");
  const [result, setResult] = useState<GameResult | null>(null);
  const [runId, setRunId] = useState(0);
  const completedRef = useRef(false);
  const isFreneticTap = gameSlug === "tap-frenetico";
  const isCoinCatch = gameSlug === "atrapa-monedas";

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") setPhase((current) => current === "running" ? "paused" : current);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const complete = useCallback((nextResult: GameResult) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setResult(nextResult);
    setPhase("completed");
    onComplete?.(nextResult);
  }, [onComplete]);

  const start = () => {
    completedRef.current = false;
    setResult(null);
    setPhase("running");
  };
  const restart = () => {
    if (!allowRestart) return;
    completedRef.current = false;
    setResult(null);
    setRunId((value) => value + 1);
    setPhase("running");
  };

  if (!isPlayableGameSlug(gameSlug)) return <section className="game-runtime-unavailable"><h2>Juego en preparación</h2><p>Este reto todavía no tiene un motor jugable disponible.</p></section>;

  return <section className={`game-runtime game-runtime-${mode}${isFreneticTap ? " game-runtime-frenetic-tap" : ""}${isCoinCatch ? " game-runtime-coin-catch" : ""}`} aria-label={`Jugar ${gameName}`}>
    <header className="game-runtime-header"><div><small>{mode === "tournament" ? "INTENTO DE TORNEO" : "PRÁCTICA GRATIS"}</small><h2>{gameName}</h2></div><span className={`game-runtime-status game-runtime-status-${phase}`}>{phase === "ready" ? "Listo" : phase === "running" ? "En juego" : phase === "paused" ? "Pausa" : "Finalizado"}</span></header>
    <div className="game-runtime-stage">
      <RegisteredGameEngine key={runId} gameSlug={gameSlug} phase={phase} onComplete={complete} />
      {phase === "ready" && <div className={`game-runtime-overlay${isFreneticTap ? " tap-runtime-ready" : ""}${isCoinCatch ? " coin-runtime-ready" : ""}`}>{isFreneticTap && <span className="tap-runtime-ready-icon"><CatalogGameIcon gameSlug="tap-frenetico" /></span>}{isCoinCatch && <span className="coin-runtime-ready-icon"><CatalogGameIcon gameSlug="atrapa-monedas" /></span>}<strong>PREPÁRATE</strong><p>{isFreneticTap ? "15 segundos. Toca tan rápido como puedas." : isCoinCatch ? "30 segundos. Atrapa monedas y evita las bombas." : "Tu resultado dependerá de tu habilidad."}</p><button type="button" onClick={start}>Iniciar juego</button></div>}
      {phase === "paused" && <div className="game-runtime-overlay"><strong>JUEGO EN PAUSA</strong><p>El tiempo está detenido.</p><button type="button" onClick={() => setPhase("running")}>Continuar</button></div>}
      {phase === "completed" && result && <div className={`game-runtime-overlay game-runtime-result${isFreneticTap ? " tap-runtime-result" : ""}${isCoinCatch ? " coin-runtime-result" : ""}`} aria-live="polite"><small>{isFreneticTap || isCoinCatch ? "PUNTUACIÓN" : "RESULTADO"}</small><strong>{result.score.toLocaleString("es-CO")} {isFreneticTap ? "TAPS" : "PTS"}</strong><dl>{Object.entries(result.metrics).filter(([key]) => !isFreneticTap || key === "tapsPerSecond").map(([key, value]) => <div key={key}><dt>{metricLabels[key] ?? key}</dt><dd>{typeof value === "number" && key === "accuracy" ? `${value}%` : String(value)}</dd></div>)}</dl><div>{allowRestart && <button type="button" onClick={restart}>Jugar de nuevo</button>}<Link href={(isFreneticTap || isCoinCatch) && mode === "tournament" ? "/tournaments" : "/virtual#games-title"}>{(isFreneticTap || isCoinCatch) && mode === "tournament" ? "Volver a torneos" : "Volver a juegos"}</Link></div></div>}
    </div>
  </section>;
}
