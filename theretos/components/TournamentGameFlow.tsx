"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconArrow, IconTrophy } from "./icons";
import { useAuth } from "./AuthProvider";
import { GameRuntime } from "./games/GameRuntime";
import type { GameResult } from "../types/games";

function TournamentAttemptRuntime({ participationId, gameSlug, gameName, onFinished }: { participationId: string; gameSlug: string; gameName: string; onFinished: (result: GameResult) => void }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const runTokenRef = useRef<string | null>(null);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const key = `theretos_attempt_run_${participationId}`;
    const runToken = runTokenRef.current ?? crypto.randomUUID();
    runTokenRef.current = runToken;
    const storedRunToken = sessionStorage.getItem(key);

    if (storedRunToken && storedRunToken !== runToken) {
      onFinishedRef.current({ gameSlug, score: 0, durationMs: 0, metrics: { abandoned: true }, completed: true });
      return;
    }

    sessionStorage.setItem(key, runToken);
    setAllowed(true);
  }, [gameSlug, participationId]);
  if (allowed === null) return <section className="tournament-game-mode tournament-game-loading"><p>Preparando intento…</p></section>;
  return <GameRuntime gameSlug={gameSlug} gameName={gameName} mode="tournament" autoStart allowRestart={false} onComplete={(result) => { sessionStorage.removeItem(`theretos_attempt_run_${participationId}`); onFinished(result); }} />;
}

export function TournamentGameFlow({ gameSlug, gameName }: { gameSlug: string; gameName: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isReady, history, startTournamentAttempt, completeTournamentAttempt, recordPracticeResult } = useAuth();
  const [justCompleted, setJustCompleted] = useState(false);
  const isTournamentMode = searchParams.get("mode") === "tournament";
  const isPracticeMode = searchParams.get("mode") === "practice";
  const participationId = searchParams.get("participation") ?? "";
  const participation = history.find((item) => item.id === participationId && item.type === "tournament");
  const isValidParticipation = participation?.gameSlug === gameSlug && Boolean(participation.tournamentId);

  useEffect(() => {
    if (isReady && isTournamentMode && !isAuthenticated) router.replace(`/login?returnTo=${encodeURIComponent(`/games/${gameSlug}?mode=tournament&participation=${participationId}`)}`);
  }, [gameSlug, isAuthenticated, isReady, isTournamentMode, participationId, router]);

  if (isPracticeMode) return <GameRuntime gameSlug={gameSlug} gameName={gameName} mode={isAuthenticated ? "practice" : "guest-practice"} onComplete={(result) => recordPracticeResult(gameName, result)} />;
  if (!isTournamentMode) return null;
  if (!isReady || !isAuthenticated) return <section className="tournament-game-mode tournament-game-loading"><p>Validando participación…</p></section>;
  if (!isValidParticipation || !participation) return <section className="tournament-game-mode"><span><IconTrophy /></span><small>MODO TORNEO</small><h2>Participación no válida</h2><p>No encontramos una participación pendiente asociada a este juego.</p><Link href="/history">Ver mi historial <IconArrow /></Link></section>;
  if (participation.status === "completed" && justCompleted) return <section className="tournament-game-result"><small>RESULTADO REGISTRADO</small><h2>{participation.score?.toLocaleString("en-US")} PTS</h2><p>Tu resultado real ha sido guardado en el torneo.</p><dl><div><dt>Torneo</dt><dd>{participation.tournamentName ?? participation.tournament}</dd></div><div><dt>Juego</dt><dd>{participation.gameName ?? participation.game}</dd></div><div><dt>Estado</dt><dd>Completado</dd></div></dl><div><Link href="/history">Ver mi historial</Link><Link href="/tournaments">Ver torneo</Link></div></section>;
  if (participation.status === "completed") return <section className="tournament-game-mode"><span><IconTrophy /></span><small>MODO TORNEO</small><h2>Este intento ya fue registrado</h2><p>La puntuación guardada para esta participación es {participation.score?.toLocaleString("en-US")} PTS.</p><Link href="/history">Ver mi historial <IconArrow /></Link></section>;
  if (participation.status === "playing") return <TournamentAttemptRuntime participationId={participation.id} gameSlug={gameSlug} gameName={gameName} onFinished={(gameResult) => { const result = completeTournamentAttempt(participation.id, gameResult); if (result.status === "success") setJustCompleted(true); }} />;
  return <section className="tournament-game-mode"><span><IconTrophy /></span><small>MODO TORNEO</small><h2>{participation.tournamentName ?? participation.tournament}</h2><strong>{participation.gameName ?? participation.game}</strong><em>1 PARTICIPACIÓN · 1 INTENTO</em><p>Este intento quedará registrado como tu resultado para este torneo.</p><button type="button" onClick={() => startTournamentAttempt(participation.id)}>Iniciar intento</button></section>;
}
