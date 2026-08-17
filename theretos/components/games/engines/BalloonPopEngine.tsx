"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createGameResult } from "../../../lib/games/result";
import type { GameEngineProps } from "../../../types/games";
import { GameViewport } from "../GameViewport";

const DURATION_MS = 30_000;
const COLORS = ["#ef4444", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#f97316", "#ec4899"];
type Balloon = { id: number; x: number; progress: number; duration: number; color: string };

export function BalloonPopEngine({ phase, onComplete }: GameEngineProps) {
  const [popped, setPopped] = useState(0);
  const [escaped, setEscaped] = useState(0);
  const [remaining, setRemaining] = useState(DURATION_MS);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const stateRef = useRef({ elapsed: 0, popped: 0, escaped: 0, spawnIn: 0, renderIn: 0, nextId: 1, balloons: [] as Balloon[] });
  const previousRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "running") { previousRef.current = null; return; }
    let frame = 0;
    const tick = (now: number) => {
      const state = stateRef.current;
      const delta = previousRef.current === null ? 0 : Math.min(100, now - previousRef.current);
      previousRef.current = now;
      state.elapsed += delta;
      state.spawnIn -= delta;
      state.renderIn -= delta;
      if (state.spawnIn <= 0) {
        state.balloons.push({ id: state.nextId++, x: 6 + Math.random() * 82, progress: 0, duration: 3_000 + Math.random() * 3_000, color: COLORS[Math.floor(Math.random() * COLORS.length)] });
        state.spawnIn += 800;
      }
      let newlyEscaped = 0;
      state.balloons = state.balloons.map((balloon) => ({ ...balloon, progress: balloon.progress + delta / balloon.duration })).filter((balloon) => { if (balloon.progress >= 1) { newlyEscaped += 1; return false; } return true; });
      if (newlyEscaped) { state.escaped += newlyEscaped; setEscaped(state.escaped); }
      if (state.renderIn <= 0) { setBalloons([...state.balloons]); state.renderIn = 40; }
      const nextRemaining = Math.max(0, DURATION_MS - state.elapsed);
      setRemaining(nextRemaining);
      if (nextRemaining <= 0) {
        state.balloons = [];
        setBalloons([]);
        const attempts = state.popped + state.escaped;
        onComplete(createGameResult("revienta-globos", state.popped, DURATION_MS, { popped: state.popped, escaped: state.escaped, accuracy: attempts ? Math.round((state.popped / attempts) * 100) : 0 }));
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [onComplete, phase]);

  const pop = useCallback((id: number) => {
    if (phase !== "running") return;
    const state = stateRef.current;
    if (!state.balloons.some((balloon) => balloon.id === id)) return;
    state.balloons = state.balloons.filter((balloon) => balloon.id !== id);
    state.popped += 1;
    setPopped(state.popped);
    setBalloons([...state.balloons]);
  }, [phase]);

  return <GameViewport label="Revienta Globos" className="balloons-engine">
    <div className="engine-hud"><div><small>TIEMPO</small><strong>{Math.ceil(remaining / 1000)}</strong></div><div><small>REVENTADOS</small><strong>{popped}</strong></div><div><small>ESCAPADOS</small><strong>{escaped}</strong></div></div>
    <div className="balloons-engine-arena">{balloons.map((balloon) => <button type="button" aria-label="Reventar globo" className="balloons-engine-balloon" style={{ left: `${balloon.x}%`, bottom: `${balloon.progress * 115 - 15}%`, color: balloon.color }} onPointerDown={(event) => { event.preventDefault(); pop(balloon.id); }} key={balloon.id}><svg viewBox="0 0 48 62" aria-hidden="true"><defs><radialGradient id={`balloon-fill-${balloon.id}`} cx="32%" cy="24%" r="78%"><stop offset="0" stopColor="white" stopOpacity=".72"/><stop offset=".2" stopColor="currentColor" stopOpacity=".96"/><stop offset="1" stopColor="currentColor"/></radialGradient></defs><path className="balloon-body" d="M24 1.5C11.7 1.5 3 10.6 3 23.4c0 11.5 7.1 20.4 17.8 24.2L18.7 52h10.6l-2.1-4.4C37.9 43.8 45 34.9 45 23.4 45 10.6 36.3 1.5 24 1.5Z" fill={`url(#balloon-fill-${balloon.id})`}/><path className="balloon-edge" d="M24 2.5C12.4 2.5 4 11.1 4 23.4c0 11.3 7.2 19.8 17.6 23.3M27.1 46.7C37.6 43.2 44 34.7 44 23.4"/><path className="balloon-highlight" d="M14.2 11.4c-3.2 3.4-4.2 8-3.6 12.1"/><path className="balloon-string" d="M24 52c-3.4 2.8 3.5 4.6 0 7.8"/></svg></button>)}</div>
  </GameViewport>;
}
